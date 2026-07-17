import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfDay, addDays } from "date-fns";
import { currentUserId } from "@/lib/auth";

const entrySchema = z.object({ content: z.string().trim().min(1).max(10000) });

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 60,
  });
  return NextResponse.json(entries);
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

  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const content = parsed.data.content;

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const existing = await prisma.journalEntry.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });

  const entry = existing
    ? await prisma.journalEntry.update({ where: { id: existing.id }, data: { content } })
    : await prisma.journalEntry.create({ data: { userId, content, date: today } });

  return NextResponse.json(entry, { status: existing ? 200 : 201 });
}
