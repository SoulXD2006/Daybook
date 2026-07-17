"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { HabitCard } from "@/components/habit-card";
import type { Habit } from "@/lib/types";

const EMOJI_CHOICES = ["📚", "🏃", "💧", "🧘", "💪", "🌙", "✍️", "🎯", "🥗", "🎸"];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);

  useEffect(() => {
    fetch("/api/habits")
      .then((res) => res.json())
      .then(setHabits)
      .catch(() => setHabits([]));
  }, []);

  async function toggle(id: string) {
    setHabits((prev) =>
      prev
        ? prev.map((h) => {
            if (h.id !== id) return h;
            const nowCompleted = !h.todayCompleted;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayIso = today.toISOString();
            const logs = nowCompleted
              ? [...h.logs, todayIso]
              : h.logs.filter((d) => new Date(d).setHours(0, 0, 0, 0) !== today.getTime());
            const streak = nowCompleted ? h.streak + 1 : Math.max(0, h.streak - 1);
            return { ...h, todayCompleted: nowCompleted, logs, streak };
          })
        : prev
    );
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
    // resync streaks from server for accuracy
    fetch("/api/habits")
      .then((res) => res.json())
      .then(setHabits)
      .catch(() => {});
  }

  async function addHabit() {
    if (!name.trim()) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), emoji }),
    });
    if (res.ok) {
      const created = await res.json();
      setHabits((prev) => [...(prev ?? []), { ...created, streak: 0, todayCompleted: false, logs: [] }]);
      setName("");
      setEmoji(EMOJI_CHOICES[0]);
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm text-text-muted">Little by little</p>
          <h1 className="font-display text-4xl italic text-text sm:text-5xl">Habits</h1>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-bg-subtle px-4 py-2 text-sm text-text transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <Plus size={15} /> New
        </button>
      </header>

      <AnimatePresence>
        {adding && (
          <div className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              autoFocus
              placeholder="Name a habit — e.g. Read, Meditate, DP practice"
              className="mb-4 w-full bg-transparent text-[15px] text-text placeholder:text-text-muted/70 outline-none"
            />
            <div className="mb-4 flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-colors ${
                    emoji === e ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-bg-subtle"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={addHabit}
                disabled={!name.trim()}
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-transform enabled:hover:scale-105 disabled:opacity-30"
              >
                Add habit
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {habits === null ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : habits.length === 0 ? (
        <p className="py-6 text-[15px] text-text-muted">
          No habits yet. Add one you want to do a little of each day — the streak grows from there.
        </p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {habits.map((h) => (
              <HabitCard key={h.id} habit={h} onToggle={toggle} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
