import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().trim().min(1).max(500),
  category: z.string().trim().max(50).nullish(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().nullish(),
});

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
  return NextResponse.json(tasks);
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
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { title, category, priority, dueDate } = parsed.data;
  const task = await prisma.task.create({
    data: {
      userId,
      title,
      category: category ?? null,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
