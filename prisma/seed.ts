import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

async function main() {
  const today = startOfDay(new Date());

  // Clear existing (idempotent reseed)
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.task.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.user.deleteMany();

  // Demo user — sign in with demo@daybook.app / daybook-demo
  const user = await prisma.user.create({
    data: {
      email: "demo@daybook.app",
      name: "Demo",
      passwordHash: await bcrypt.hash("daybook-demo", 12),
    },
  });
  const userId = user.id;

  // Tasks
  await prisma.task.createMany({
    data: [
      { userId, title: "Call mom", category: "Personal", priority: "high", dueDate: addToTime(today, 18) },
      { userId, title: "Finish DP practice set", category: "Learning", priority: "high", dueDate: addToTime(addDays(today, 2), 20) },
      { userId, title: "Reply to Sarah's email", category: "Work", priority: "medium", dueDate: addToTime(today, 15) },
      { userId, title: "Book dentist appointment", category: "Health", priority: "medium", dueDate: addToTime(addDays(today, 4), 12) },
      { userId, title: "Water the plants", category: "Home", priority: "low", dueDate: null },
      { userId, title: "Read a chapter before bed", category: "Personal", priority: "low", dueDate: addToTime(today, 22) },
      { userId, title: "Submit expense report", category: "Work", priority: "high", dueDate: addToTime(addDays(today, -1), 17), completed: false },
    ],
  });

  // Habits with some history
  const habitDefs = [
    { name: "Read", emoji: "📚", density: 0.75 },
    { name: "Meditate", emoji: "🧘", density: 0.6 },
    { name: "Drink water", emoji: "💧", density: 0.85 },
    { name: "Move / exercise", emoji: "🏃", density: 0.5 },
  ];

  for (const def of habitDefs) {
    const habit = await prisma.habit.create({ data: { userId, name: def.name, emoji: def.emoji } });
    const logs: { habitId: string; date: Date; completed: boolean }[] = [];
    // Build a realistic streak: last few days mostly done
    for (let i = 60; i >= 1; i--) {
      if (Math.random() < def.density) {
        logs.push({ habitId: habit.id, date: addDays(today, -i), completed: true });
      }
    }
    // Ensure a current streak of a few days for visual interest
    for (let i = 1; i <= 3; i++) {
      const d = addDays(today, -i);
      if (!logs.some((l) => l.date.getTime() === d.getTime())) {
        logs.push({ habitId: habit.id, date: d, completed: true });
      }
    }
    await prisma.habitLog.createMany({ data: logs });
  }

  // Journal entries across past days (gives the insight engine something to chew on)
  const journalContents = [
    "Long day. Spent most of it heads-down on the DP problems and still feel behind. Told myself I'd stop at 10 and didn't.",
    "Better today. Went for a walk before work and it genuinely reset my head. Called mom, she sounded happy.",
    "Kept getting pulled into meetings, barely touched the practice set again. Frustrated with how the day slipped.",
    "Quiet Sunday. Read most of the afternoon. No pressure, which was nice for once.",
    "Back at the algorithms grind. Made progress on graphs finally — the intuition is starting to click.",
    "Tired. Skipped the workout, told myself tomorrow. Ate dinner too late again.",
  ];
  for (let i = 0; i < journalContents.length; i++) {
    await prisma.journalEntry.create({
      data: { userId, content: journalContents[i], date: addDays(today, -(journalContents.length - i)) },
    });
  }

  console.log("Seeded demo user (demo@daybook.app / daybook-demo) with tasks, habits, and journal entries.");
}

function addToTime(day: Date, hour: number) {
  const r = new Date(day);
  r.setHours(hour, 0, 0, 0);
  return r;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
