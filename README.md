# LC Computer Build & Repair — AI Assistant

A private web dashboard for running the business: a Claude-powered assistant that
knows the shop, an appointment scheduler, and (in later phases) email and website
integration.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Prisma 7** with a **SQLite** database for local dev (swap to Postgres for cloud)
- **Claude** (`claude-opus-4-8`) via the Anthropic SDK, with tools to read the
  schedule and book appointments
- Cookie-based owner login (`iron-session`)

## Setup

1. Install dependencies (already done if you scaffolded this):

   ```bash
   npm install
   ```

2. Configure `.env` (already created — edit these values):

   - `OWNER_PASSWORD` — the password you use to log in (default `changeme`)
   - `ANTHROPIC_API_KEY` — get one at https://console.anthropic.com/ . The
     assistant stays disabled until this is set.
   - `SESSION_SECRET` — already generated for you.

3. Create the database and seed sample data:

   ```bash
   npm run db:push
   npm run db:seed   # optional: adds a few example appointments
   ```

4. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in.

## What works today (Phase 1)

- **Dashboard** — greeting, today's schedule, weekly/open-job counts.
- **Assistant** — chat that knows the business, checks the schedule, and books
  appointments. Needs `ANTHROPIC_API_KEY`.
- **Appointments** — list, create, and update status (drop-off, pickup, in-home,
  phone, in-store).

## Business knowledge

Everything the assistant knows about the shop — services, hours, appointment
types — lives in [`lib/business.ts`](lib/business.ts). These are starter defaults;
edit them to match the real business (or they'll be filled in from the website).

## Roadmap

- **Phase 2 — Email:** connect Gmail (owner authorizes via Google OAuth); triage
  the inbox, summarize threads, draft replies for approval.
- **Phase 3 — Website:** a public chat widget that answers visitor questions and
  captures/books jobs into this dashboard.

## Deploying (always-on cloud)

For a live, always-on deployment:

1. Switch the Prisma datasource `provider` to `postgresql` and point
   `DATABASE_URL` at a hosted Postgres (e.g. Neon's free tier), then update the
   driver adapter in [`lib/db.ts`](lib/db.ts).
2. Deploy to Railway, Render, or Vercel with the same environment variables.
