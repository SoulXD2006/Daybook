export type Task = {
  id: string;
  title: string;
  category: string | null;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JournalEntry = {
  id: string;
  content: string;
  date: string;
  createdAt: string;
};

export type Habit = {
  id: string;
  name: string;
  emoji: string | null;
  streak: number;
  todayCompleted: boolean;
  logs: string[];
};
