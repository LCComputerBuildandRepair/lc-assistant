import { db } from "./db";
import { business } from "./business";

/**
 * Booking availability engine — the native replacement for Calendly.
 *
 * Times are wall-clock in the shop's local timezone. Set TZ=America/New_York on
 * the server (Mansfield, Ohio is Eastern) so slots line up with real hours.
 * Edit `availability` below to match the shop's actual bookable hours.
 */

type Window = [string, string]; // ["09:00", "18:00"]

export const availability = {
  /** Bookable start times are generated on this granularity (minutes). */
  slotMinutes: 30,
  /** Earliest a customer can book, measured from now (hours). */
  leadHours: 2,
  /** How far into the future customers can book (days). */
  advanceDays: 21,
  /** How many appointments can occupy the same slot (like Calendly's single host). */
  perSlotCapacity: 1,

  /**
   * Bookable windows per weekday (0 = Sunday … 6 = Saturday). null = closed.
   * These are starting defaults — update to the shop's real hours.
   */
  hours: {
    0: null, // Sunday
    1: [["09:00", "18:00"]], // Monday
    2: [["09:00", "18:00"]], // Tuesday
    3: [["09:00", "18:00"]], // Wednesday
    4: [["09:00", "18:00"]], // Thursday
    5: [["09:00", "18:00"]], // Friday
    6: [["10:00", "16:00"]], // Saturday
  } as Record<number, Window[] | null>,
} as const;

function serviceDuration(serviceKey: string): number {
  return business.services.find((s) => s.key === serviceKey)?.typicalDurationMin ?? 60;
}

/** Build a Date at a wall-clock "HH:MM" on the same calendar day as `day`. */
function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight (no timezone shift). */
export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a Date as YYYY-MM-DD in local time. */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Available start times for a given service on a given day, excluding slots that
 * are in the past, before the lead time, or already fully booked.
 */
export async function getAvailableSlots(serviceKey: string, day: Date): Promise<Date[]> {
  const windows = availability.hours[day.getDay()];
  if (!windows) return [];

  const duration = serviceDuration(serviceKey);
  const now = new Date();
  const earliest = new Date(now.getTime() + availability.leadHours * 60 * 60 * 1000);

  // Candidate start times across all open windows for the day.
  const candidates: Date[] = [];
  for (const [start, end] of windows) {
    const windowStart = atTime(day, start).getTime();
    const windowEnd = atTime(day, end).getTime();
    for (let t = windowStart; t + duration * 60000 <= windowEnd; t += availability.slotMinutes * 60000) {
      const slot = new Date(t);
      if (slot >= earliest) candidates.push(slot);
    }
  }
  if (candidates.length === 0) return [];

  // Existing appointments that could overlap this day.
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existing = await db.appointment.findMany({
    where: {
      scheduledAt: { gte: new Date(dayStart.getTime() - 6 * 60 * 60 * 1000), lt: dayEnd },
      status: { notIn: ["cancelled", "no_show"] },
    },
    select: { scheduledAt: true, durationMin: true },
  });

  return candidates.filter((slot) => {
    const slotStart = slot.getTime();
    const slotEnd = slotStart + duration * 60000;
    let overlaps = 0;
    for (const a of existing) {
      const aStart = a.scheduledAt.getTime();
      const aEnd = aStart + a.durationMin * 60000;
      if (slotStart < aEnd && aStart < slotEnd) overlaps++;
    }
    return overlaps < availability.perSlotCapacity;
  });
}

/** Is a specific start time still bookable for a service? (Re-checked at booking.) */
export async function isSlotOpen(serviceKey: string, start: Date): Promise<boolean> {
  const slots = await getAvailableSlots(serviceKey, start);
  return slots.some((s) => s.getTime() === start.getTime());
}

/** The next `advanceDays` of days that have at least one open slot for a service. */
export async function getOpenDays(serviceKey: string): Promise<string[]> {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < availability.advanceDays; i++) {
    const day = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const slots = await getAvailableSlots(serviceKey, day);
    if (slots.length > 0) out.push(toYMD(day));
  }
  return out;
}
