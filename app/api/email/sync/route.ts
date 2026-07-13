import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isLoggedIn } from "@/lib/session";
import { mailConfigured, fetchRecent } from "@/lib/mail";
import { hasApiKey } from "@/lib/claude";
import { triageEmail } from "@/lib/email-assistant";

export async function POST() {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "No mailbox connected. Add MAIL_USER + MAIL_APP_PASSWORD to .env." },
      { status: 503 },
    );
  }

  let fetched;
  try {
    fetched = await fetchRecent(20);
  } catch (err) {
    console.error("IMAP fetch failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach the mailbox — check the email + app password." },
      { status: 502 },
    );
  }

  let created = 0;
  for (const m of fetched) {
    const exists = await db.email.findUnique({ where: { messageId: m.messageId } });
    if (exists) continue;

    let triage = null;
    if (hasApiKey()) {
      try {
        triage = await triageEmail(m);
      } catch (err) {
        console.error("Triage failed:", err);
      }
    }

    await db.email.create({
      data: {
        messageId: m.messageId,
        fromName: m.fromName,
        fromEmail: m.fromEmail,
        subject: m.subject,
        bodyText: m.bodyText,
        receivedAt: m.receivedAt,
        summary: triage?.summary ?? null,
        category: triage?.category ?? null,
        priority: triage?.priority ?? null,
        draftReply: triage?.draftReply || null,
        status: triage?.draftReply ? "drafted" : "new",
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, fetched: fetched.length, created });
}
