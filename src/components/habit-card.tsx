"use client";

import { Flame, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HabitHeatmap } from "@/components/habit-heatmap";
import type { Habit } from "@/lib/types";

export function HabitCard({ habit, onToggle }: { habit: Habit; onToggle: (id: string) => void }) {
  return (
    <motion.div layout className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{habit.emoji || "•"}</span>
          <div>
            <p className="text-[15px] font-medium text-text">{habit.name}</p>
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <Flame size={12} className={habit.streak > 0 ? "text-accent" : "text-text-muted"} />
              {habit.streak > 0 ? `${habit.streak} day streak` : "No streak yet"}
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggle(habit.id)}
          aria-label="Toggle today"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
            habit.todayCompleted ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
          )}
        >
          {habit.todayCompleted && <Check size={16} strokeWidth={3} />}
        </button>
      </div>

      <HabitHeatmap doneDates={habit.logs} />
    </motion.div>
  );
}
