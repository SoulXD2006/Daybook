# Daybook — Full-Stack Case Study

A complete walkthrough of how Daybook was built: architecture, every tool choice with its reasoning, the problems hit along the way, and the engineering decisions behind them.

**Live:** https://daybookupload.vercel.app · **Stack:** Next.js 16 · TypeScript · Prisma 7 · Neon Postgres · Auth.js v5 · Tailwind v4 · Framer Motion · Google Gemini · Vercel

---

## Contents

1. [The 30-second pitch](#1-the-30-second-pitch)
2. [Architecture](#2-architecture)
3. [Tech stack & why each piece](#3-tech-stack--why-each-piece)
4. [Data model](#4-data-model)
5. [Feature deep-dives](#5-feature-deep-dives)
6. [Auth & security](#6-auth--security)
7. [Deployment pipeline](#7-deployment-pipeline)
8. [Problems hit & how they were fixed](#8-problems-hit--how-they-were-fixed)
9. [Design Q&A](#9-design-qa)
10. [Quick-fire glossary](#10-quick-fire-glossary)

---

## 1. The 30-second pitch

> Daybook is a full-stack personal productivity app built and deployed to production. Users type tasks in plain English — like *"remind me to call mom Thursday"* — and Google's Gemini LLM parses them into structured tasks with dates, priorities, and categories. It also generates a warm AI daily briefing, has a journal that surfaces patterns across entries over time, and tracks habit streaks with a calendar heatmap. It's a Next.js 16 app with TypeScript, Postgres via Prisma ORM, email/password auth with Auth.js, per-user data isolation, and it's live on Vercel with the database on Neon. Built end-to-end: schema design, API security, LLM integration with graceful fallbacks, responsive UI with dark mode, and the deploy pipeline.

**Size:** ~60 files · 17 routes (4 pages + 13 API endpoints) · 6 database tables

## 2. Architecture

Daybook is a **monolithic full-stack Next.js app** — one codebase and one deployment serves the UI, the API, and the database access layer. No separate backend repo, no CORS headaches, shared TypeScript types between client and server.

```
Browser (React 19)  →  Next.js server (server components + API routes)  →  Prisma 7 (pg adapter)  →  Neon Postgres
                                        ↓
                              Google Gemini (gemini-2.5-flash, structured JSON output)
```

Request flow for a protected page like `/journal`:

1. A **server component layout** checks the session (`auth()`) and redirects to `/signin` if absent — protection happens on the server before any UI ships.
2. The page's **client component** renders, then fetches `/api/journal`.
3. The **route handler** re-validates the session (never trust the client), scopes the query to `userId`, and returns JSON.

Note the **double check** — page-level redirect for UX, API-level 401 for security. The API check is the real boundary; the redirect is a courtesy.

## 3. Tech stack & why each piece

| Tool | Role | Why this one |
|---|---|---|
| **Next.js 16** | Full-stack framework | App Router gives file-based routing, server components (auth checks without client JS), and API routes in one project. Deploys natively to Vercel. |
| **TypeScript** | Language | End-to-end type safety: Prisma generates types from the DB schema, so a schema change breaks the build instead of production. |
| **React 19** | UI | Server/client component split keeps the JS bundle small. |
| **Tailwind CSS v4** | Styling | Design tokens defined once as CSS variables, consumed as utilities. Dark mode via a `.dark` class toggle. |
| **Framer Motion** | Animation | Declarative animations; `AnimatePresence` handles exit animations React can't do alone. |
| **Prisma 7** | ORM | Schema-first: one `.prisma` file generates SQL migrations *and* the typed client. v7 driver adapters — the app talks to Postgres through `pg` explicitly. |
| **Neon Postgres** | Database | Serverless Postgres, free tier. Required because Vercel's filesystem is ephemeral — SQLite files don't survive between requests. |
| **Auth.js v5** | Authentication | The Next.js standard. Credentials provider + JWT session strategy — sessions live in an encrypted httpOnly cookie, no session table. |
| **bcryptjs** | Password hashing | Adaptive hashing, cost factor 12. Passwords never stored in plain text. |
| **zod** | Input validation | Schema validation on every API write — never trust request bodies. |
| **Google Gemini** | LLM | `gemini-2.5-flash`: fast, cheap, supports **structured output** — hand it a JSON schema, get valid JSON back, no fragile string parsing. |
| **Vercel** | Hosting | Zero-config Next.js deploys from GitHub; serverless functions, CDN, HTTPS automatic. |

## 4. Data model

Six tables. `User` is the root — every other row belongs to exactly one user via a foreign key with `onDelete: Cascade` (delete an account, all its data goes with it).

```
User          id · email (unique) · name · passwordHash
 ├─ Task         title · category · priority · dueDate · completed · completedAt
 ├─ JournalEntry content · date            (one per user per day, upserted)
 ├─ Insight      content · createdAt       (cached AI observations)
 ├─ DailySummary content · date            (@@unique [userId, date] — cache key)
 └─ Habit        name · emoji · archived
     └─ HabitLog date · completed          (@@unique [habitId, date])
```

Design details:

- **Composite unique constraints as cache keys.** `DailySummary @@unique([userId, date])` means "one AI summary per user per day" is enforced *by the database*, and lets the API do a single `upsert` instead of check-then-write (no race condition).
- **`HabitLog @@unique([habitId, date])`** makes double-logging a day impossible at the schema level.
- **Indexes follow the queries:** `@@index([userId, completed, dueDate])` on Task matches exactly how the Today view fetches.
- **Soft delete for habits** (`archived` flag) so deleting a habit doesn't destroy streak history; **hard delete for tasks** where history has no value.

## 5. Feature deep-dives

### Natural-language task parsing

User types free text → `POST /api/tasks/parse` → Gemini is called with a **JSON response schema** (title, dueDate, priority, category) plus the current date so relative phrases resolve → the structured result is validated and inserted.

```ts
// The critical Gemini config — forces valid JSON, no regex parsing
generationConfig: {
  responseMimeType: "application/json",
  responseSchema: taskSchema,   // typed Schema object
}
```

**Graceful degradation:** if Gemini errors, times out, or no API key is configured, the endpoint catches it and stores the raw text as a plain task instead of failing. The user never sees an error; the app works without AI, just with less magic. The LLM is an enhancement, not a dependency.

### AI daily summary

On loading the Today view, `/api/summary` gathers today's tasks, the week's deadlines, and unchecked habits, and asks Gemini for a 2–3 sentence briefing in a warm tone. The result is **cached per user per day** in `DailySummary` — the LLM runs once each morning, not on every page load. Deliberate API-cost decision.

### Journal with memory

One entry per day (posting again the same day updates it — an upsert keyed on date range). The insight endpoint feeds the last 14 entries to Gemini asking for *one gentle recurring pattern*, only when 3+ entries exist, cached daily. Because entries persist in Postgres, the "memory" is real cross-session state, not a chat context window.

### Habit streaks

Streaks are **computed on read, not stored** — a stored counter can drift; deriving from logs is always correct. The algorithm walks backwards from today:

```ts
function computeStreak(doneDays: Set<number>, today: Date): number {
  let cursor = startOfDay(today);
  if (!doneDays.has(cursor.getTime())) cursor = subDays(cursor, 1);
  //  ^ today isn't checked yet — streak survives until midnight
  let streak = 0;
  while (doneDays.has(cursor.getTime())) { streak++; cursor = subDays(cursor, 1); }
  return streak;
}
```

The heatmap renders 90 days of logs as a CSS grid, GitHub-contribution style.

## 6. Auth & security

### Authentication flow

1. **Register:** `POST /api/register` → zod-validate → check email uniqueness → `bcrypt.hash(password, 12)` → create user → auto sign-in.
2. **Sign in:** Auth.js credentials provider looks up the user, `bcrypt.compare()`, and on success issues a **JWT stored in an httpOnly cookie** (JS can't read it — XSS can't steal it). The user id is embedded via the `jwt` callback.
3. **Every request after:** `auth()` decodes the cookie server-side; a helper `currentUserId()` is the first line of every API handler.

### Defense layers

| Layer | Implementation |
|---|---|
| Session gate | Every API route returns `401` without a valid session; protected pages redirect via a server layout. |
| Data isolation | Every query includes `where: { userId }`. Mutations use `updateMany/deleteMany({ id, userId })` — if the row isn't yours, count is 0 → `404`. Prevents IDOR. |
| Input validation | zod schemas on every write body: length caps, enum checks, email normalization. |
| Rate limiting | In-memory sliding window: 5 registrations / 15 min per IP; per-user caps on the three Gemini endpoints. |
| Secrets hygiene | `.env` git-ignored; secrets live only in local env + Vercel's dashboard; fresh `AUTH_SECRET` for production. |
| SQL injection | Non-issue by construction — Prisma parameterizes every query; no raw SQL anywhere. |

**Verified by test, both directions:** a fresh account saw 0 of the demo user's tasks, created its own, and the demo account couldn't see it either. Unauthenticated requests: 401. Wrong password: rejected.

## 7. Deployment pipeline

```
git push  →  Vercel build (install → generate → migrate → build)  →  Production (serverless + CDN + HTTPS)
```

```json
"build": "prisma generate && prisma migrate deploy && next build",
"postinstall": "prisma generate"
```

- `prisma generate` — the typed client is *generated code*, git-ignored, so it must be rebuilt on the build machine.
- `prisma migrate deploy` — applies pending SQL migrations to Neon **during deploy**. Schema changes ship themselves; no manual DB steps.
- Config lives in three environment variables set in Vercel's dashboard: `DATABASE_URL`, `GEMINI_API_KEY`, `AUTH_SECRET` — none in code.

## 8. Problems hit & how they were fixed

**SQLite → Postgres migration for serverless.** The app started on SQLite (zero-setup local file). Deploying to Vercel forced the realization that serverless filesystems are ephemeral — the SQLite file would vanish between invocations. Fixed by swapping the Prisma provider to `postgresql`, the driver adapter from `better-sqlite3` to `pg`, regenerating migrations, and moving to Neon. Because all DB access went through Prisma, **zero application code changed** — only config.

**Adding a required foreign key to tables with existing rows.** Adding `userId` (required) to tables that already had data made the migration fail. In dev the fix was reset-and-reseed; in production the strategy would be: add nullable → backfill → make required, in three migrations.

**Stale generated Prisma client.** After schema changes, runtime errors like `prisma.user is undefined` appeared — the generated client was stale. Generated code is a build artifact that must be regenerated after every schema change; automated via `postinstall`.

**TypeScript rejecting the Gemini response schema.** TS widened enum literal types in the schema object. Fix: explicit `Schema` type annotation on the constant.

**Prisma 7 config not loading .env.** Migrations failed with "connection url is empty" — Prisma 7's new `prisma.config.ts` doesn't auto-load `.env`. One-line fix: `import "dotenv/config"`.

**Secrets nearly leaking via manual GitHub upload.** GitHub's web "upload files" bypasses `.gitignore` — the mechanism that keeps `.env` out of the repo. Caught it, verified the repo was private, switched to git-push deploys. Lesson: secrets hygiene is a pipeline property, not a one-time check.

## 9. Design Q&A

**Why Next.js instead of separate React + Express?**
One deployable, shared types, no CORS, server components allow auth checks before any JS reaches the browser, and API routes give a real backend without a second repo.

**Why JWT sessions instead of database sessions?**
JWTs avoid a DB read on every request. Trade-off: no per-token revocation before expiry; rotating `AUTH_SECRET` is the blunt fallback. Acceptable for this threat model; a banking app would use DB sessions.

**How is cross-user data access prevented?**
Server-verified `userId` from the session; every read filters on it; every mutation enforces ownership in the same atomic query (`updateMany({ id, userId })`), not check-then-act. IDs are CUIDs (non-sequential) so enumeration is impractical anyway — but the design doesn't rely on that.

**What happens when the LLM fails or hallucinates?**
Structured output constrains the shape; try/catch fallbacks keep the app working; zod validates before anything touches the DB. The AI can degrade the experience but can never corrupt data or take the app down.

**How would this scale to 100k users?**
Stateless app tier scales horizontally already. Bottlenecks: in-memory rate limiter → Redis; Postgres connections from serverless → pooling (Neon's pooled endpoint); LLM cost → already capped ~2 calls/user/day by caching.

**Why Prisma over raw SQL?**
The schema file generates both migrations and TS types — a breaking schema change becomes a compile error, not a runtime surprise. Proof: the SQLite→Postgres swap touched zero query code.

**How does dark mode work?**
Design tokens as CSS variables, redefined under a `.dark` class. An inline script in `<head>` reads localStorage (falling back to OS preference) and sets the class **before first paint** — that ordering prevents the flash of wrong theme.

## 10. Quick-fire glossary

| Term | One-breath definition |
|---|---|
| ORM | Maps database tables to typed code objects; Prisma generates the client from a schema file. |
| Migration | A versioned SQL script evolving the schema; committed to git, replayable anywhere. |
| JWT | Signed token carrying claims (user id); verified cryptographically, no DB lookup. |
| httpOnly cookie | Cookie invisible to JavaScript — session theft via XSS is blocked. |
| bcrypt | Deliberately slow, salted password hash; cost factor tunes slowness against hardware. |
| IDOR | Insecure Direct Object Reference — changing an ID in a URL to reach someone else's data; blocked by ownership-scoped queries. |
| Upsert | Update-or-insert in one atomic operation, keyed on a unique constraint. |
| Serverless | Functions spun up per request, no persistent machine — hence no local file storage. |
| Structured output | Constraining an LLM to return JSON matching a schema instead of free text. |
| Hydration | React attaching interactivity to server-rendered HTML in the browser. |
| Rate limiting | Capping requests per identity per time window. |
