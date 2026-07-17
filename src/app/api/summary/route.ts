import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailySummary } from "@/lib/gemini";
import { startOfDay, addDays } from "date-fns";
import { currentUserId } from "@/lib/auth";
import { rateLimit, maybeCleanup } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekOut = addDays(today, 7);

  if (!force) {
    const cached = await prisma.dailySummary.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (cached) {
      return NextResponse.json({ summary: cached.content, cached: true });
    }
  }

  maybeCleanup();
  // AI endpoint: cap regeneration per user
  if (!rateLimit(`summary:${userId}`, 15, 60 * 60 * 1000)) {
    const cached = await prisma.dailySummary.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    return NextResponse.json({ summary: cached?.content ?? "Take today one step at a time.", cached: true });
  }

  const [todayTasks, upcoming, habits] = await Promise.all([
    prisma.task.findMany({
      where: { userId, dueDate: { gte: today, lt: tomorrow } },
      orderBy: { priority: "desc" },
    }),
    prisma.task.findMany({
      where: { userId, dueDate: { gte: tomorrow, lt: weekOut }, completed: false },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
      include: { logs: { where: { date: today } } },
    }),
  ]);

  const habitsPending = habits.filter((h) => !h.logs.some((l) => l.completed)).map((h) => h.name);

  let summary: string;
  try {
    summary = await generateDailySummary({
      weekday: today.toLocaleDateString("en-US", { weekday: "long" }),
      dateLabel: today.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      todayTasks: todayTasks.map((t) => ({ title: t.title, priority: t.priority, completed: t.completed })),
      upcoming: upcoming.map((t) => ({ title: t.title, dueDate: t.dueDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" }) })),
      habitsPending,
    });
  } catch (err) {
    console.error("generateDailySummary failed", err);
    summary =
      todayTasks.length > 0
        ? `You've got ${todayTasks.length} thing${todayTasks.length === 1 ? "" : "s"} on the list today. Take them one at a time.`
        : "Nothing urgent on the books today — a good day to get ahead, or just breathe.";
  }

  await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date: today } },
    update: { content: summary },
    create: { userId, date: today, content: summary },
  });

  return NextResponse.json({ summary, cached: false });
}
