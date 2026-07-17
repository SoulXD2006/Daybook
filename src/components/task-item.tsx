"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

const priorityDot: Record<Task["priority"], string> = {
  high: "bg-accent",
  medium: "bg-accent/50",
  low: "bg-text-muted/40",
};

export function TaskItem({
  task,
  onToggle,
  showTime = false,
  showDate = false,
}: {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  showTime?: boolean;
  showDate?: boolean;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="group flex items-center gap-3 py-2.5"
    >
      <button
        onClick={() => onToggle(task.id, !task.completed)}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          task.completed ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
        )}
      >
        {task.completed && <Check size={12} strokeWidth={3} />}
      </button>

      <span className={cn("shrink-0 h-1.5 w-1.5 rounded-full", priorityDot[task.priority])} />

      <span
        className={cn(
          "flex-1 text-[15px] leading-tight transition-colors",
          task.completed ? "text-text-muted line-through decoration-text-muted/50" : "text-text"
        )}
      >
        {task.title}
      </span>

      {task.category && (
        <span className="hidden shrink-0 rounded-full bg-bg-subtle px-2.5 py-0.5 text-xs text-text-muted sm:inline">
          {task.category}
        </span>
      )}

      {due && (showTime || showDate) && (
        <span className="shrink-0 text-xs text-text-muted">
          {showDate &&
            due.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (showTime ? " · " : "")}
          {showTime && due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      )}
    </motion.li>
  );
}
