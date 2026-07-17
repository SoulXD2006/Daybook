import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateJournalInsight } from "@/lib/gemini";
import { startOfDay } from "date-fns";
import { currentUserId } from "@/lib/auth";
import { rateLimit, maybeCleanup } from "@/lib/rate-limit";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = startOfDay(new Date());

  const cachedToday = await prisma.insight.findFirst({
    where: { userId, createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
  });
  if (cachedToday) {
    return NextResponse.json({ insight: cachedToday.content });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 14,
  });

  if (entries.length < 3) {
    return NextResponse.json({ insight: null });
  }

  maybeCleanup();
  // AI endpoint: cache miss means a Gemini call — cap per user
  if (!rateLimit(`insight:${userId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ insight: null });
  }

  try {
    const insight = await generateJournalInsight(
      entries
        .slice()
        .reverse()
        .map((e) => ({ date: e.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), content: e.content }))
    );

    if (insight) {
      await prisma.insight.create({ data: { userId, content: insight } });
    }

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("generateJournalInsight failed", err);
    return NextResponse.json({ insight: null });
  }
}
