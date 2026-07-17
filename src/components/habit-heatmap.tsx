"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function HabitHeatmap({ doneDates, weeksBack = 13 }: { doneDates: string[]; weeksBack?: number }) {
  const doneSet = useMemo(() => new Set(doneDates.map((d) => startOfDay(new Date(d)).getTime())), [doneDates]);

  const { weeks, monthMarkers } = useMemo(() => {
    const today = startOfDay(new Date());
    const daysBack = weeksBack * 7 - 1;
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - daysBack);
    const gridStart = new Date(rangeStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const allDays: Date[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= today) {
      allDays.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    while (allDays.length % 7 !== 0) {
      allDays.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    const monthMarkers = weeks.map((week) => {
      const first = week[0];
      return first.getDate() <= 7 ? first.toLocaleDateString("en-US", { month: "short" }) : "";
    });

    return { weeks, monthMarkers, today };
  }, [weeksBack]);

  const today = startOfDay(new Date());

  return (
    <div className="flex gap-[3px] overflow-x-auto py-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          <span className="block h-3 text-[9px] leading-3 text-text-muted">{monthMarkers[wi]}</span>
          {week.map((day, di) => {
            const isFuture = day > today;
            const done = doneSet.has(day.getTime());
            return (
              <div
                key={di}
                title={day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                className={cn(
                  "h-3 w-3 rounded-[3px]",
                  isFuture ? "bg-transparent" : done ? "bg-accent" : "bg-bg-subtle"
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
