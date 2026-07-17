# Daybook

A calm, personal daily companion — natural-language tasks, an end-of-day journal that remembers, and habit streaks. Built to feel like a nice page to open each morning, not an admin dashboard.

Powered by **Next.js 16**, **Auth.js v5**, **Prisma 7 + Postgres**, **Tailwind v4**, **Framer Motion**, and **Google Gemini** for the language work.

## Features

- **User accounts.** Email + password sign-up with bcrypt hashing and JWT sessions (Auth.js v5). Every user's tasks, journal, habits, and AI summaries are fully private to them.
- **Natural-language task capture.** Type `remind me to call mom Thursday` or `finish DP practice by Sunday` into a single input; Gemini parses it into a structured task with date, priority, and category.
- **A daily view** with a warm, AI-written "here's your day" note, today's tasks, overdue items, and upcoming deadlines sorted by real urgency.
- **An end-of-day journal** that saves one entry per day and occasionally surfaces a gentle pattern it's noticed across past entries (stored, so it has real memory over time).
- **Habit tracking** with streak counts and a 90-day calendar heatmap.
- **Landing page** for signed-out visitors; **dark mode**; responsive from phone to desktop; subtle purposeful motion.
- **Hardened API**: every route requires a session, all queries are scoped per-user with ownership checks, inputs validated with zod, and auth + AI endpoints are rate-limited.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment.** Copy the example and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — a Postgres connection string. Free options: [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   - `GEMINI_API_KEY` — get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Without it, task parsing falls back to storing the raw text and the daily note uses a simple built-in message — the app still runs.
   - `AUTH_SECRET` — generate one with `npx auth secret` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Required for sign-in sessions.

3. **Set up the database** (applies the schema to your Postgres database):
   ```bash
   npx prisma migrate dev
   ```

4. **(Optional) Seed a demo account** so it doesn't open empty:
   ```bash
   npm run seed
   ```
   This creates a demo user — sign in with **demo@daybook.app** / **daybook-demo** — pre-loaded with sample tasks, habit history, and journal entries. (Seeding wipes existing data; skip it if you already have real data.)

5. **Run it**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Deploying (Vercel)

Daybook is a single Next.js app (frontend + API + DB access in one server), ready for Vercel:

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. In the Vercel project settings → Environment Variables, add:
   - `DATABASE_URL` — your Postgres connection string
   - `GEMINI_API_KEY` — your Gemini key
   - `AUTH_SECRET` — a **fresh** secret for production (don't reuse your local one)
3. Deploy. Migrations are applied by the build step (`prisma migrate deploy`).

Also works on Railway, Render, Fly.io, or any Node host — same env vars, then `npm run build && npm start`.

Security checklist before going public: fresh `AUTH_SECRET`, HTTPS (any platform above gives you this), and don't commit `.env` (already git-ignored).

## Notes

- The Prisma client is generated into `src/generated/prisma` (Prisma 7 requires an explicit output path) and uses the `pg` driver adapter.
- All data lives in your database — nothing leaves the server except the text sent to Gemini for parsing and summaries.
- Gemini model defaults to `gemini-2.5-flash`; override with `GEMINI_MODEL` in `.env`.
- Rate limiting is in-memory (fine for one server); swap `src/lib/rate-limit.ts` for a Redis-backed limiter if you run multiple instances.
