"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, NotebookPen, Flame } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Speak your tasks",
    body: "“Remind me to call mom Thursday” becomes a real task — dated, prioritized, categorized. No forms.",
  },
  {
    icon: NotebookPen,
    title: "A journal that remembers",
    body: "Write a line each evening. Over time, Daybook gently points out patterns you might not see yourself.",
  },
  {
    icon: Flame,
    title: "Habits that stick",
    body: "A few daily habits, honest streaks, and a heatmap of your consistency — satisfying, not stressful.",
  },
];

export function Landing() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <p className="mb-2 text-sm text-text-muted">A calmer daily companion</p>
        <h1 className="mb-5 font-display text-5xl italic leading-tight text-text sm:text-6xl">
          Your days, gently&nbsp;organized.
        </h1>
        <p className="mb-10 max-w-lg text-[17px] leading-relaxed text-text-muted">
          Daybook is a personal assistant for everyday life — tasks you can type in plain
          English, an end-of-day journal with a memory, and habit streaks worth keeping.
          Made to be a nice page to open each morning.
        </p>

        <div className="mb-16 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-7 py-3 text-[15px] font-medium text-accent-foreground transition-transform hover:scale-105"
          >
            Start your Daybook
          </Link>
          <Link
            href="/signin"
            className="rounded-full px-5 py-3 text-[15px] text-text-muted transition-colors hover:text-text"
          >
            Sign in
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-8 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: "easeOut" }}
          >
            <Icon size={20} className="mb-3 text-accent" />
            <h3 className="mb-1.5 font-medium text-text">{title}</h3>
            <p className="text-sm leading-relaxed text-text-muted">{body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
