import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.completed === "boolean") {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 500);
  if (typeof body.priority === "string" && ["low", "medium", "high"].includes(body.priority)) {
    data.priority = body.priority;
  }
  if (body.category !== undefined) {
    data.category = typeof body.category === "string" ? body.category.slice(0, 50) : null;
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate as string) : null;

  // Filtering by userId means users can only touch their own tasks
  const result = await prisma.task.updateMany({ where: { id, userId }, data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = await prisma.task.findUnique({ where: { id } });
  return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.task.deleteMany({ where: { id, userId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
