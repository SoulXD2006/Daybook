import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { currentUserId } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().max(8).nullish(),
});

function computeStreak(doneDayKeys: Set<number>, today: Date): number {
  let cursor = startOfDay(today);
  if (!doneDayKeys.has(cursor.getTime())) {
    cursor = subDays(cursor, 1);
  }
  let streak = 0;
  while (doneDayKeys.has(cursor.getTime())) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());
  const rangeStart = subDays(today, 90);

  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: "asc" },
    include: { logs: { where: { date: { gte: rangeStart } } } },
  });

  const result = habits.map((habit) => {
    const doneDayKeys = new Set(habit.logs.filter((l) => l.completed).map((l) => l.date.getTime()));
    return {
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      streak: computeStreak(doneDayKeys, today),
      todayCompleted: doneDayKeys.has(today.getTime()),
      logs: habit.logs.filter((l) => l.completed).map((l) => l.date.toISOString()),
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const habit = await prisma.habit.create({
    data: { userId, name: parsed.data.name, emoji: parsed.data.emoji ?? null },
  });
  return NextResponse.json(habit, { status: 201 });
}
