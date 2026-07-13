# Going live — LC Computer Build & Repair Assistant

This guide takes the app from your computer to an always-on public URL your
customers can use. Recommended host: **Railway** (always-on, cheap, supports the
reminder scheduler). The database is **SQLite on a persistent volume** — nothing
to migrate, exactly what you've been running.

You'll need accounts for: **Railway**, **Anthropic** (AI), **Resend** (email
sending), **Twilio** (texts), plus an **app password** for your mailbox.

---

## 1. Put the code on GitHub

Railway deploys from a GitHub repo.

```bash
cd lc-assistant
git add -A
git commit -m "LC Computer Build & Repair assistant"
# create an empty private repo on github.com, then:
git remote add origin https://github.com/<you>/lc-assistant.git
git push -u origin main
```

`.env` is gitignored, so your secrets stay out of GitHub (you'll set them in Railway).

## 2. Create the Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pick `lc-assistant`.
2. Railway auto-detects Next.js and builds it.
3. In the service **Settings**:
   - **Start command:** `npm run start:prod`  (creates the DB tables, then serves)
   - Generate a **public domain** (Settings → Networking → Generate Domain). That URL is your app — call it `APP_URL` below.

## 3. Add a persistent volume (your database)

1. In the service → **Volumes** → **New Volume**, mount path **`/data`**.
2. This keeps your database (appointments, quotes, messages, emails) safe across restarts and deploys.

## 4. Set environment variables

In the service → **Variables**, add these (copy the names from your local `.env`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `file:/data/prod.db` |
| `TZ` | `America/New_York` |
| `NODE_ENV` | `production` |
| `OWNER_PASSWORD` | your dashboard login password |
| `SESSION_SECRET` | a long random string (keep your local one, or make a new one) |
| `ANTHROPIC_API_KEY` | from console.anthropic.com |
| `OWNER_EMAIL` | `lukepennywitt@yahoo.com` |
| `OWNER_PHONE` | your cell, e.g. `+14195551234` |
| `RESEND_API_KEY` + `NOTIFY_FROM_EMAIL` | from resend.com |
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | from twilio.com |
| `MAIL_PROVIDER` | `yahoo` (or `gmail`) |
| `MAIL_USER` | your email address |
| `MAIL_APP_PASSWORD` | mailbox app password (see §7) |
| `ALLOWED_ORIGIN` | `https://lccomputerbuildandrepair.com` |
| `CRON_SECRET` | keep your local one |
| `QUOTE_*` | optional — tune tax/markup/labor (defaults are fine) |

Redeploy after saving. Visit `APP_URL` and log in.

## 5. Turn on appointment reminders

Railway → **New** → **Cron** (or a scheduled job) that runs once a day:

```bash
curl -s -X GET "$APP_URL/api/cron/reminders" -H "Authorization: Bearer $CRON_SECRET"
```

Schedule it for the morning (e.g. `0 9 * * *`). It texts/emails tomorrow's customers.

## 6. Your website is already built in

Your marketing site (index, repair, websites, homecalls, commercial, gallery) now
lives in this project's `public/` folder and is served by the same app:

- Homepage at `/`, pages at `/repair`, `/websites`, `/homecalls`, `/commercial`, `/gallery`.
- **Book Now** already points to `/book` (Calendly removed — cancel it whenever).
- The **contact form** already posts to `/api/contact` (via `public/contact-hook.js`).
- The **chat bubble** already loads on every page (via `public/embed.js`).

So once this is deployed, `APP_URL` **is** your whole website. Point your domain
(lccomputerbuildandrepair.com) at the Railway deployment (Settings → Networking →
Custom Domain) and you're fully live — nothing external to edit.

You can add a **"Get a Quote"** link anywhere pointing to `/quote`.

## 7. Mailbox app password (for the Inbox)

Turn on 2-factor auth first, then create an **app password** (not your login password):
- **Yahoo:** account.yahoo.com → Account Security → Generate app password
- **Gmail:** myaccount.google.com → Security → App passwords

Put it in `MAIL_APP_PASSWORD`. Then the Inbox tab's "Check mail" works.

## 8. Backups

Your data lives in `/data/prod.db` on the Railway volume. To back up, download it
periodically (Railway shell: `cp /data/prod.db /data/backup-$(date +%F).db`, or
pull it down). Low-traffic, but worth a monthly copy.

---

### Optional: custom subdomain
Point `app.lccomputerbuildandrepair.com` (or `book.`) at Railway (Settings →
Networking → Custom Domain) so customers see your brand instead of a railway.app URL.
Update `ALLOWED_ORIGIN` and the embed/booking URLs to match.
