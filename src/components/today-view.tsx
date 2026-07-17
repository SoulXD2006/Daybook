"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { TaskInput } from "@/components/task-input";
import { TaskItem } from "@/components/task-item";
import { DailySummary } from "@/components/daily-summary";
import type { Task } from "@/lib/types";

function greeting(name?: string): string {
  const h = new Date().getHours();
  const base = h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${base}, ${name}` : base;
}

export function TodayView({ userName }: { userName?: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  async function toggleTask(id: string, completed: boolean) {
    setTasks((prev) => prev && prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  }

  function addTask(task: Task) {
    setTasks((prev) => (prev ? [task, ...prev] : [task]));
  }

  const { overdue, today, upcoming, doneToday } = useMemo(() => {
    const list = tasks ?? [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const doneToday: Task[] = [];

    for (const t of list) {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      if (t.completed) {
        if (due && due >= startOfToday && due < startOfTomorrow) doneToday.push(t);
        else if (!due) doneToday.push(t);
        continue;
      }
      if (!due) {
        today.push(t);
      } else if (due < startOfToday) {
        overdue.push(t);
      } else if (due < startOfTomorrow) {
        today.push(t);
      } else {
        upcoming.push(t);
      }
    }

    overdue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    today.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    upcoming.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return { overdue, today, upcoming, doneToday };
  }, [tasks]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-8">
        <p className="text-sm text-text-muted">{dateLabel}</p>
        <h1 className="font-display text-4xl italic text-text sm:text-5xl">{greeting(userName)}</h1>
      </header>

      <div className="mb-10 min-h-[3rem]">
        <DailySummary />
      </div>

      <div className="mb-10">
        <TaskInput onCreated={addTask} />
      </div>

      {tasks === null ? (
        <p className="text-sm text-text-muted">Loading your day…</p>
      ) : (
        <div className="space-y-10">
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-medium text-danger">Overdue</h2>
              <ul className="divide-y divide-border/60">
                <AnimatePresence initial={false}>
                  {overdue.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={toggleTask} showDate />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-1 text-sm font-medium text-text-muted">Today</h2>
            {today.length === 0 ? (
              <p className="py-3 text-sm text-text-muted">Nothing left for today.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                <AnimatePresence initial={false}>
                  {today.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={toggleTask} showTime />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-medium text-text-muted">Upcoming</h2>
              <ul className="divide-y divide-border/60">
                <AnimatePresence initial={false}>
                  {upcoming.slice(0, 8).map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={toggleTask} showDate />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}

          {doneToday.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-medium text-text-muted">Done today</h2>
              <ul className="divide-y divide-border/60">
                <AnimatePresence initial={false}>
                  {doneToday.map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={toggleTask} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
