import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { currentUserId } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Ownership check: the habit must belong to the signed-in user
  const habit = await prisma.habit.findFirst({ where: { id, userId } });
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = startOfDay(new Date());

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: id, date: today } },
  });

  if (existing) {
    await prisma.habitLog.update({ where: { id: existing.id }, data: { completed: !existing.completed } });
    return NextResponse.json({ completed: !existing.completed });
  }

  await prisma.habitLog.create({ data: { habitId: id, date: today, completed: true } });
  return NextResponse.json({ completed: true });
}
