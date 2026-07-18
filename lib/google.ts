/**
 * Google integration via a Google Apps Script web app (runs as the owner, so it
 * has native access to their Calendar, Sheets, and Docs — no service account).
 *
 * Set GOOGLE_SCRIPT_URL (the deployed web-app URL) and GOOGLE_SCRIPT_SECRET
 * (must match the SECRET in the script). See google-apps-script.gs for the code.
 *
 * All functions are best-effort and never throw.
 */

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_SCRIPT_URL;
}

async function postToGoogle(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.GOOGLE_SCRIPT_SECRET || "", ...payload }),
      redirect: "follow",
    });
    if (!res.ok) {
      console.error(`[google] script error ${res.status}: ${await res.text()}`);
      return null;
    }
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch (err) {
    console.error("[google] script failed:", err);
    return null;
  }
}

/** Add an appointment to the owner's Google Calendar. */
export async function syncBookingToGoogle(appt: {
  title: string;
  startISO: string;
  endISO: string;
  description: string;
  location: string;
}): Promise<void> {
  await postToGoogle({ type: "booking", ...appt });
}

export interface QuoteSyncInput {
  quoteNumber?: string;
  customerName: string;
  contact: string;
  kind: string;
  summary: string;
  items: { qty: number; name: string; unitPrice?: number; lineTotal: number }[];
  partsCharge: number;
  tax: number;
  labor: number;
  total: number;
  assumptions: string;
  createdISO: string;
  expiresISO: string;
  business?: {
    name: string;
    owner: string;
    phone: string;
    email: string;
    location: string;
    website: string;
  };
}

/** Append the quote to the tracking Sheet and create a Doc. Returns the Doc URL. */
export async function syncQuoteToGoogle(quote: QuoteSyncInput): Promise<{ docUrl?: string }> {
  const res = await postToGoogle({ type: "quote", ...quote });
  return { docUrl: res && typeof res.docUrl === "string" ? res.docUrl : undefined };
}
