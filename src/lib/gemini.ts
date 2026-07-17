import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your .env file.");
  }
  return new GoogleGenerativeAI(apiKey);
}

export type ParsedTask = {
  title: string;
  dueDate: string | null; // ISO 8601 datetime, or null
  priority: "low" | "medium" | "high";
  category: string | null;
};

const taskSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "A short, clean task title with date/time words removed." },
    dueDate: {
      type: SchemaType.STRING,
      nullable: true,
      description: "ISO 8601 datetime (YYYY-MM-DDTHH:mm:ss) for when the task is due, or null if no date was implied.",
    },
    priority: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["low", "medium", "high"],
      description: "How urgent/important the task sounds. Default to medium unless there are clear signals.",
    },
    category: {
      type: SchemaType.STRING,
      nullable: true,
      description: "A short single-word-or-two category, e.g. Work, Personal, Health, Learning, Errands. Null if unclear.",
    },
  },
  required: ["title", "dueDate", "priority", "category"],
};

export async function parseTaskFromText(input: string, now: Date = new Date()): Promise<ParsedTask> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: taskSchema,
    },
  });

  const nowIso = now.toISOString();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const prompt = `You turn a casual, natural-language task capture into structured data.

Current date/time: ${nowIso} (${weekday}).

When the user mentions a relative day like "Thursday" or "Sunday", resolve it to the next upcoming occurrence of that day (today counts if the time hasn't passed). When they say "tomorrow", "tonight", "next week", etc., resolve those relative to the current date/time too. If a time of day is mentioned, include it; otherwise default to 18:00 local time for dated tasks. If no date is implied at all, return null for dueDate.

Text: "${input}"`;

  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text());
  return json as ParsedTask;
}

export async function generateDailySummary(context: {
  weekday: string;
  dateLabel: string;
  todayTasks: { title: string; priority: string; completed: boolean }[];
  upcoming: { title: string; dueDate: string }[];
  habitsPending: string[];
}): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You write a short "here's your day" note for a personal daily-planning app called Daybook. Tone: warm, human, a little encouraging, like a thoughtful friend glancing at your day with you — never corporate, never a bulleted status report, no emoji, no headers. 2-4 sentences, plain prose.

It's ${context.weekday}, ${context.dateLabel}.

Today's tasks: ${context.todayTasks.length ? context.todayTasks.map((t) => `${t.title} (${t.priority}${t.completed ? ", done" : ""})`).join("; ") : "nothing scheduled"}.

Upcoming deadlines soon: ${context.upcoming.length ? context.upcoming.map((t) => `${t.title} (due ${t.dueDate})`).join("; ") : "none"}.

Habits not yet checked off today: ${context.habitsPending.length ? context.habitsPending.join(", ") : "none, or no habits tracked"}.

Write the note now, directly, with no preamble like "Here's your summary:".`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

const insightSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    hasInsight: {
      type: SchemaType.BOOLEAN,
      description: "Whether a genuinely interesting recurring pattern or theme was found across entries. Be conservative — false if entries are too few or too varied.",
    },
    insight: {
      type: SchemaType.STRING,
      nullable: true,
      description: "One or two warm, gentle sentences naming the pattern, written directly to the person. Null if hasInsight is false.",
    },
  },
  required: ["hasInsight", "insight"],
};

export async function generateJournalInsight(
  entries: { date: string; content: string }[]
): Promise<string | null> {
  if (entries.length < 3) return null;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: insightSchema,
    },
  });

  const prompt = `You are a thoughtful, private journaling companion. Below are someone's recent daily journal entries. Look for a genuine recurring theme, feeling, or pattern across multiple entries (not just one) — e.g. recurring stress about a topic, a recurring source of joy, a habit of procrastinating on something, a recurring person or project that comes up.

Only surface something if it's real and non-obvious — don't force it. Be warm and gentle, never clinical, never presumptuous. Speak directly to them ("you've mentioned..." not "the user has...").

Entries (oldest first):
${entries.map((e) => `[${e.date}] ${e.content}`).join("\n\n")}`;

  const result = await model.generateContent(prompt);
  const json = JSON.parse(result.response.text()) as { hasInsight: boolean; insight: string | null };
  return json.hasInsight ? json.insight : null;
}
