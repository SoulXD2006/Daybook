"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Task } from "@/lib/types";

export function TaskInput({ onCreated }: { onCreated: (task: Task) => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = value.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Couldn't add that one — try again?");
      const task = (await res.json()) as Task;
      onCreated(task);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm transition-shadow focus-within:shadow-md">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          disabled={loading}
          placeholder="Remind me to call mom Thursday, or finish DP practice by Sunday…"
          className="flex-1 bg-transparent text-base text-text placeholder:text-text-muted/70 outline-none disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          aria-label="Add task"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform enabled:hover:scale-105 disabled:opacity-30"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </div>
      {error && <p className="mt-2 px-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
