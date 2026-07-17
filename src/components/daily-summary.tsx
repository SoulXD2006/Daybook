"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function DailySummary() {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSummary(data.summary);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence>
      {summary && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display text-xl italic leading-relaxed text-text sm:text-2xl"
        >
          {summary}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
