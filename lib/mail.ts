import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";

/**
 * Mailbox connection via IMAP (read) + SMTP (send), using an app password.
 * Works for Yahoo or Gmail — set MAIL_PROVIDER and generate an app password
 * (both require 2-factor auth to be on first).
 *
 *   MAIL_PROVIDER      yahoo | gmail | custom
 *   MAIL_USER          the full email address
 *   MAIL_APP_PASSWORD  an app password (NOT the account password)
 *   MAIL_IMAP_HOST / MAIL_SMTP_HOST   only for MAIL_PROVIDER=custom
 */

const PRESETS: Record<string, { imap: string; smtp: string }> = {
  yahoo: { imap: "imap.mail.yahoo.com", smtp: "smtp.mail.yahoo.com" },
  gmail: { imap: "imap.gmail.com", smtp: "smtp.gmail.com" },
};

function cfg() {
  const provider = (process.env.MAIL_PROVIDER || "yahoo").toLowerCase();
  const preset = PRESETS[provider];
  return {
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_APP_PASSWORD || "",
    imapHost: process.env.MAIL_IMAP_HOST || preset?.imap || "",
    smtpHost: process.env.MAIL_SMTP_HOST || preset?.smtp || "",
  };
}

export function mailConfigured(): boolean {
  const c = cfg();
  return !!(c.user && c.pass && c.imapHost && c.smtpHost);
}

export interface FetchedEmail {
  messageId: string;
  fromName: string | null;
  fromEmail: string;
  subject: string | null;
  bodyText: string;
  receivedAt: Date;
}

/** Fetch the most recent messages from the INBOX. */
export async function fetchRecent(limit = 20): Promise<FetchedEmail[]> {
  const c = cfg();
  const client = new ImapFlow({
    host: c.imapHost,
    port: 993,
    secure: true,
    auth: { user: c.user, pass: c.pass },
    logger: false,
  });

  const out: FetchedEmail[] = [];
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const total = typeof client.mailbox === "object" ? client.mailbox.exists : 0;
    if (total > 0) {
      const from = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${from}:*`, { source: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const addr = parsed.from?.value?.[0];
        out.push({
          messageId: parsed.messageId || `seq-${msg.seq}-${parsed.date?.getTime() ?? ""}`,
          fromName: addr?.name || null,
          fromEmail: addr?.address || "unknown",
          subject: parsed.subject || null,
          bodyText: (parsed.text || parsed.html || "").toString().slice(0, 8000),
          receivedAt: parsed.date || new Date(),
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  // Newest first.
  return out.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
}

/** Send a reply from the connected mailbox. */
export async function sendReply(opts: {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
}): Promise<void> {
  const c = cfg();
  const transport = nodemailer.createTransport({
    host: c.smtpHost,
    port: 465,
    secure: true,
    auth: { user: c.user, pass: c.pass },
  });
  await transport.sendMail({
    from: c.user,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    inReplyTo: opts.inReplyTo,
    references: opts.inReplyTo,
  });
}
