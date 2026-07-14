/**
 * Owner notifications — email and SMS.
 *
 * Everything is pluggable via environment variables and dependency-free (all
 * providers are called over HTTPS with fetch). If nothing is configured, we log
 * to the console so the flow is testable in development.
 *
 * Email: Resend (https://resend.com) — set RESEND_API_KEY + NOTIFY_FROM_EMAIL.
 * SMS:   SMS_PROVIDER = "twilio" | "carrier" | "none"
 *          twilio  → TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *          carrier → free email-to-text; set OWNER_CARRIER_GATEWAY (e.g. vtext.com)
 *                    Sends an email to <ownerPhoneDigits>@<gateway>, so email must
 *                    also be configured.
 */

import { business } from "./business";
import { smtpConfigured, sendSMTP } from "./mail";

// Where owner alerts go. Falls back to the business config so it works even
// without OWNER_EMAIL / OWNER_PHONE env vars set.
const OWNER_EMAIL = process.env.OWNER_EMAIL || business.email || process.env.NOTIFY_FROM_EMAIL || "";
const OWNER_PHONE = normalizePhone(process.env.OWNER_PHONE || business.phone || "");

/** Normalize a US phone to E.164 (+1XXXXXXXXXX) for Twilio; leave others as-is. */
function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return p.trim();
}

export interface NotifyResult {
  email: "sent" | "skipped" | "error";
  sms: "sent" | "skipped" | "error";
  detail?: string;
}

/** Notify the shop owner by email and text. Never throws. `ical` attaches a
 *  calendar invite to the email (so Google Calendar adds the event). */
export async function notifyOwner(
  subject: string,
  body: string,
  opts?: { ical?: string },
): Promise<NotifyResult> {
  const [email, sms] = await Promise.all([
    sendOwnerEmail(subject, body, opts?.ical),
    sendOwnerSms(`${subject}\n${body}`),
  ]);
  return { email, sms };
}

// --- Email -------------------------------------------------------------------

async function sendOwnerEmail(subject: string, body: string, ical?: string): Promise<NotifyResult["email"]> {
  if (!OWNER_EMAIL) return "skipped";
  return sendEmail(OWNER_EMAIL, subject, body, ical);
}

/**
 * Send an email. Prefers your mailbox over SMTP (reliable, no domain setup);
 * falls back to Resend, then console logging.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  ical?: string,
): Promise<"sent" | "skipped" | "error"> {
  // 1. SMTP via the connected mailbox (MAIL_USER + MAIL_APP_PASSWORD).
  if (smtpConfigured()) {
    try {
      await sendSMTP({ to, subject, text: body, ical });
      return "sent";
    } catch (err) {
      console.error("[notify:email] SMTP failed:", err);
      return "error";
    }
  }

  // 2. Resend (needs a verified domain to send to arbitrary recipients).
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (!apiKey || !from) {
    console.log(`[notify:email → ${to}] ${subject}\n${body}\n(no mailbox/Resend configured — logged only)`);
    return "skipped";
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      console.error(`[notify:email] Resend error ${res.status}: ${await res.text()}`);
      return "error";
    }
    return "sent";
  } catch (err) {
    console.error("[notify:email] failed:", err);
    return "error";
  }
}

// --- SMS ---------------------------------------------------------------------

async function sendOwnerSms(message: string): Promise<NotifyResult["sms"]> {
  if (!OWNER_PHONE) return "skipped";
  return sendSms(OWNER_PHONE, message);
}

/** Send a text via the configured SMS provider. */
export async function sendSms(
  toPhone: string,
  message: string,
): Promise<"sent" | "skipped" | "error"> {
  const provider = (process.env.SMS_PROVIDER || "none").toLowerCase();

  if (provider === "twilio") {
    return sendTwilioSms(toPhone, message);
  }
  if (provider === "carrier") {
    const gateway = process.env.OWNER_CARRIER_GATEWAY;
    if (!gateway) {
      console.log(`[notify:sms] carrier gateway not set — logged only:\n${message}`);
      return "skipped";
    }
    // Carrier gateways want the 10-digit number (no country code).
    const digits = toPhone.replace(/\D/g, "").slice(-10);
    // Email-to-text: send a short email to the carrier's SMS gateway.
    return sendEmail(`${digits}@${gateway}`, "", message);
  }

  console.log(`[notify:sms → ${toPhone}] (SMS_PROVIDER not set) ${message}`);
  return "skipped";
}

async function sendTwilioSms(
  toPhone: string,
  message: string,
): Promise<"sent" | "skipped" | "error"> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[notify:sms] Twilio not configured — logged only:\n${message}`);
    return "skipped";
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: toPhone, From: from, Body: message }),
      },
    );
    if (!res.ok) {
      console.error(`[notify:sms] Twilio error ${res.status}: ${await res.text()}`);
      return "error";
    }
    return "sent";
  } catch (err) {
    console.error("[notify:sms] failed:", err);
    return "error";
  }
}
