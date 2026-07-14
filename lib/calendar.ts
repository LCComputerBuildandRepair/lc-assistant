import { business, serviceName, appointmentTypeName } from "./business";

function icsDate(d: Date): string {
  // 2026-07-15T14:00:00.000Z -> 20260715T140000Z
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Build an iCalendar (.ics) invite for a booking. Sent with METHOD:REQUEST so
 * Google Calendar (and Outlook/Apple) auto-add it when it arrives by email.
 */
export function buildBookingICS(appt: {
  id: string;
  customerName: string;
  serviceType: string;
  type: string;
  scheduledAt: Date;
  durationMin: number;
  location?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
}): string {
  const start = appt.scheduledAt;
  const end = new Date(start.getTime() + (appt.durationMin || 60) * 60000);
  const owner = business.email;
  const summary = `${serviceName(appt.serviceType)} — ${appt.customerName}`;
  const desc = [
    `${serviceName(appt.serviceType)} (${appointmentTypeName(appt.type)})`,
    appt.customerPhone ? `Phone: ${appt.customerPhone}` : "",
    appt.customerEmail ? `Email: ${appt.customerEmail}` : "",
    appt.notes ? `Notes: ${appt.notes}` : "",
  ]
    .filter(Boolean)
    .join("\\n");
  const loc = appt.location || business.location;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LC Computer Build & Repair//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${appt.id}@lccomputerbuildandrepair.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(desc)}`,
    `LOCATION:${esc(loc)}`,
    `ORGANIZER;CN=${esc(business.name)}:mailto:${owner}`,
    `ATTENDEE;CN=${esc(business.owner)};RSVP=FALSE:mailto:${owner}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
