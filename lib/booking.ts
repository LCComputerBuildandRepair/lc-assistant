import { db } from "./db";
import { isSlotOpen } from "./availability";
import { notifyOwner, sendEmail, sendSms } from "./notify";
import { buildBookingICS } from "./calendar";
import { business, serviceName, appointmentTypeName } from "./business";

export interface BookingInput {
  name: string;
  service: string;
  type?: string;
  scheduledAt: string; // ISO 8601
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  notes?: string | null;
  source?: string;
}

export type BookingResult =
  | { ok: true; id: string; when: string }
  | { ok: false; status: 400 | 409; error: string };

/**
 * Create a booking: validate, re-check the slot, persist, and send the customer
 * confirmation + owner alert. Shared by the public booking page and the AI chat.
 */
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const name = (input.name ?? "").trim();
  const service = (input.service ?? "").trim();
  const type = (input.type ?? "dropoff").trim();
  const iso = (input.scheduledAt ?? "").trim();

  if (!name || !service || !iso) {
    return { ok: false, status: 400, error: "Name, service, and a time are required." };
  }
  if (!business.services.some((s) => s.key === service)) {
    return { ok: false, status: 400, error: "Unknown service." };
  }

  const scheduledAt = new Date(iso);
  if (isNaN(scheduledAt.getTime())) {
    return { ok: false, status: 400, error: "Invalid time." };
  }

  if (!(await isSlotOpen(service, scheduledAt))) {
    return { ok: false, status: 409, error: "That time was just taken. Please pick another." };
  }

  const duration =
    business.services.find((s) => s.key === service)?.typicalDurationMin ?? 60;

  const appt = await db.appointment.create({
    data: {
      customerName: name,
      customerPhone: input.phone ?? null,
      customerEmail: input.email ?? null,
      serviceType: service,
      type,
      status: "confirmed",
      scheduledAt,
      durationMin: duration,
      location: input.location ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "website",
    },
  });

  const when = scheduledAt.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const confirmation = [
    `You're booked with ${business.name}!`,
    "",
    `${serviceName(service)} — ${appointmentTypeName(type)}`,
    `When: ${when}`,
    input.location ? `Where: ${input.location}` : `Where: ${business.location}`,
    "",
    "Need to change it? Just reply or give us a call.",
  ].join("\n");
  const ical = buildBookingICS(appt);

  // Await all sends so the serverless function stays alive until they finish.
  await Promise.allSettled([
    input.email ? sendEmail(input.email, `Booking confirmed — ${business.name}`, confirmation) : null,
    input.phone ? sendSms(input.phone, confirmation) : null,
    notifyOwner(
      "New booking",
      [
        `${name} booked ${serviceName(service)} (${appointmentTypeName(type)})`,
        `When: ${when}`,
        input.phone ? `Phone: ${input.phone}` : null,
        input.email ? `Email: ${input.email}` : null,
        input.notes ? `Notes: ${input.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      { ical },
    ),
  ]);

  return { ok: true, id: appt.id, when };
}
