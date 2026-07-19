import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

/** Deletes all of the signed-in user's completed tasks. */
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.task.deleteMany({ where: { userId, completed: true } });
  return NextResponse.json({ cleared: result.count });
}
