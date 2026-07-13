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

const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.NOTIFY_FROM_EMAIL || "";
const OWNER_PHONE = process.env.OWNER_PHONE || "";

export interface NotifyResult {
  email: "sent" | "skipped" | "error";
  sms: "sent" | "skipped" | "error";
  detail?: string;
}

/** Notify the shop owner by email and text. Never throws. */
export async function notifyOwner(subject: string, body: string): Promise<NotifyResult> {
  const [email, sms] = await Promise.all([
    sendOwnerEmail(subject, body),
    sendOwnerSms(`${subject}\n${body}`),
  ]);
  return { email, sms };
}

// --- Email -------------------------------------------------------------------

async function sendOwnerEmail(subject: string, body: string): Promise<NotifyResult["email"]> {
  if (!OWNER_EMAIL) return "skipped";
  return sendEmail(OWNER_EMAIL, subject, body);
}

/** Send an email via Resend. Falls back to console logging when unconfigured. */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<"sent" | "skipped" | "error"> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log(`[notify:email → ${to}] ${subject}\n${body}\n(no RESEND_API_KEY/NOTIFY_FROM_EMAIL — logged only)`);
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
    const digits = toPhone.replace(/\D/g, "");
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
