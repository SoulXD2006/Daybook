import { startOfDay, isSameDay, subDays, differenceInCalendarDays } from "date-fns";

export function dayKey(date: Date): string {
  return startOfDay(date).toISOString();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export { startOfDay, isSameDay, subDays, differenceInCalendarDays };
