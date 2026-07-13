import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, sendSms } from "@/lib/notify";
import { business, serviceName } from "@/lib/business";

/**
 * Sends reminders for appointments happening within the next ~24 hours.
 * Trigger this once or twice a day from a scheduler (e.g. a cron job, Vercel Cron,
 * or a Railway scheduled task). Protect it with CRON_SECRET.
 *
 *   GET /api/cron/reminders  with header  Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await db.appointment.findMany({
    where: {
      scheduledAt: { gte: now, lte: in24h },
      status: { in: ["scheduled", "confirmed"] },
      reminderSentAt: null,
    },
  });

  let sent = 0;
  for (const a of upcoming) {
    const when = a.scheduledAt.toLocaleString(undefined, {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    });
    const msg = [
      `Reminder: your ${serviceName(a.serviceType)} with ${business.name} is ${when}.`,
      a.location ? `Where: ${a.location}` : `Where: ${business.location}`,
      "See you then! Reply or call if you need to reschedule.",
    ].join("\n");

    if (a.customerEmail) await sendEmail(a.customerEmail, `Reminder — ${business.name}`, msg);
    if (a.customerPhone) await sendSms(a.customerPhone, msg);
    await db.appointment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
    sent++;
  }

  return NextResponse.json({ ok: true, reminded: sent });
}
