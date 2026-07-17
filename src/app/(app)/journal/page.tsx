"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { JournalInsight } from "@/components/journal-insight";
import type { JournalEntry } from "@/lib/types";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/journal")
      .then((res) => res.json())
      .then((data: JournalEntry[]) => {
        setEntries(data);
        const todayEntry = data.find((e) => isToday(e.date));
        if (todayEntry) setDraft(todayEntry.content);
      })
      .catch(() => setEntries([]));
  }, []);

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() }),
      });
      const entry = (await res.json()) as JournalEntry;
      setEntries((prev) => {
        const rest = (prev ?? []).filter((e) => !isToday(e.date));
        return [entry, ...rest];
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  }

  const pastEntries = (entries ?? []).filter((e) => !isToday(e.date));

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-8">
        <p className="text-sm text-text-muted">End of day</p>
        <h1 className="font-display text-4xl italic text-text sm:text-5xl">How did today go?</h1>
      </header>

      <JournalInsight />

      <div className="mb-14 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write freely — a line or a page. Whatever today was."
          rows={6}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-text placeholder:text-text-muted/70 outline-none"
        />
        <div className="flex items-center justify-end gap-3 pt-2">
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm text-secondary"
              >
                <Check size={14} /> Saved
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-transform enabled:hover:scale-105 disabled:opacity-30"
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>

      {pastEntries.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-text-muted">Past entries</h2>
          <ul className="space-y-6">
            {pastEntries.map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-4">
                <p className="mb-1 text-xs text-text-muted">
                  {new Date(e.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{e.content}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
