import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseTaskFromText } from "@/lib/gemini";
import { currentUserId } from "@/lib/auth";
import { rateLimit, maybeCleanup } from "@/lib/rate-limit";

const parseSchema = z.object({ text: z.string().trim().min(1).max(1000) });

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeCleanup();
  // AI endpoint: per-user limit protects the Gemini quota
  if (!rateLimit(`parse:${userId}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Slow down a little — try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsedBody = parseSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const text = parsedBody.data.text;

  try {
    const parsed = await parseTaskFromText(text);

    const task = await prisma.task.create({
      data: {
        userId,
        title: parsed.title || text,
        category: parsed.category,
        priority: parsed.priority || "medium",
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("parseTaskFromText failed, falling back to raw title", err);
    const task = await prisma.task.create({
      data: { userId, title: text, priority: "medium" },
    });
    return NextResponse.json(task, { status: 201 });
  }
}
