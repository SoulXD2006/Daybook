"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle } from "lucide-react";

export function JournalInsight() {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/journal/insight")
      .then((res) => res.json())
      .then((data) => setInsight(data.insight))
      .catch(() => setInsight(null));
  }, []);

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex gap-3 rounded-2xl bg-accent-soft px-5 py-4 text-accent"
        >
          <Sparkle size={18} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p className="text-[15px] leading-relaxed">{insight}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
