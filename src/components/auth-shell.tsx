"use client";

import { motion } from "framer-motion";

export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="mb-1 text-sm text-text-muted">{eyebrow}</p>
        <h1 className="mb-8 font-display text-4xl italic text-text">{title}</h1>
        {children}
      </motion.div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm text-text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-text outline-none transition-colors placeholder:text-text-muted/50 focus:border-accent"
      />
    </label>
  );
}
