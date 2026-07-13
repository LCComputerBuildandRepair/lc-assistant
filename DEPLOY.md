# Going live on Netlify — LC Computer Build & Repair

The app runs on **Netlify** (serverless) with a **Neon** Postgres database. Your
Squarespace domain already points to Netlify, so there are no DNS changes.

## 1. Create the database (Neon)

1. Go to [neon.tech](https://neon.tech) → sign up (free) → **Create project**.
2. Copy the **Pooled connection string** (Dashboard → Connect → toggle "Pooled connection").
   It looks like `postgresql://...-pooler...neon.tech/neondb?sslmode=require`.
   Use the **pooled** one — serverless needs it.

## 2. Connect the repo to Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → **GitHub** → pick **`lc-assistant`**.
2. Netlify auto-detects Next.js. Leave the build settings as-is (this repo's `netlify.toml` sets the build command and installs the Next.js runtime).

## 3. Set environment variables

Site → **Site configuration → Environment variables** → add these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Neon **pooled** connection string |
| `OWNER_PASSWORD` | your dashboard login password |
| `SESSION_SECRET` | a long random string (copy from your local `.env`) |
| `CRON_SECRET` | a long random string (copy from your local `.env`) |
| `ANTHROPIC_API_KEY` | from console.anthropic.com — powers assistant, chat, quotes |
| `QUOTE_WEB_SEARCH` | `off` (keeps quotes within the serverless time limit) |
| `OWNER_EMAIL` | `lukepennywitt@yahoo.com` |
| `OWNER_PHONE` | your cell, e.g. `+14195551234` |
| `RESEND_API_KEY` + `NOTIFY_FROM_EMAIL` | from resend.com — sends emails |
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | from twilio.com — texts |
| `MAIL_PROVIDER` | `yahoo` |
| `MAIL_USER` | `lukepennywitt@yahoo.com` |
| `MAIL_APP_PASSWORD` | Yahoo app password (Account Security → Generate app password) |
| `ALLOWED_ORIGIN` | `https://lccomputerbuildandrepair.com` |

The site runs with just `DATABASE_URL`, `OWNER_PASSWORD`, and `SESSION_SECRET`.
The rest turn on AI / texts / email — add them anytime; the build auto-redeploys.

## 4. Deploy

Trigger a deploy (Netlify does it on connect and on every push to `main`). The
build runs `prisma db push` against Neon to create your tables, then builds the site.

## 5. Point your domain

Your domain already resolves to Netlify, so in Netlify → **Domain management**,
add **`lccomputerbuildandrepair.com`** (and `www`) to this site. No Squarespace/DNS
changes needed if the domain is already on this Netlify account.

## 6. Appointment reminders (daily)

Netlify functions don't run on a schedule by themselves, so use a free external
cron: [cron-job.org](https://cron-job.org) → new job → **GET**
`https://YOUR-SITE/api/cron/reminders`, header `Authorization: Bearer <CRON_SECRET>`,
once a day (e.g. 9am). It texts/emails the next day's customers.

## Notes / serverless limits

- **Quotes** run in fast-estimate mode (`QUOTE_WEB_SEARCH=off`) to fit Netlify's
  function time limit. If the chat or quote ever times out, that's the function
  duration cap — raising it needs a Netlify plan that allows longer functions.
- **Inbox**: each "Check mail" AI-triages up to `EMAIL_TRIAGE_MAX` (default 5) new
  emails to stay within the time limit; click again to process more.
- Local dev now also needs a `DATABASE_URL` (point it at your Neon dev branch).
