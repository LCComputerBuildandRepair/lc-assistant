"use client";

import { useEffect, useState } from "react";
import { business } from "@/lib/business";

interface Slot {
  iso: string;
  label: string;
}

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const label = "block text-sm font-medium text-slate-700";

function defaultType(serviceKey: string): string {
  const cat = business.services.find((s) => s.key === serviceKey)?.category;
  if (cat === "Home Calls") return "home_call";
  if (cat === "Website Design") return "remote";
  return "dropoff";
}

function dayLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function BookPage() {
  const [service, setService] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [type, setType] = useState("dropoff");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  // Load open days when a service is chosen.
  useEffect(() => {
    if (!service) return;
    setDays([]);
    setDay("");
    setSlots([]);
    setSlot(null);
    setType(defaultType(service));
    setLoadingDays(true);
    fetch(`/api/availability?service=${encodeURIComponent(service)}`)
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setError("Couldn't load availability."))
      .finally(() => setLoadingDays(false));
  }, [service]);

  // Load slots when a day is chosen.
  useEffect(() => {
    if (!service || !day) return;
    setSlots([]);
    setSlot(null);
    setLoadingSlots(true);
    fetch(`/api/availability?service=${encodeURIComponent(service)}&date=${day}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setError("Couldn't load times."))
      .finally(() => setLoadingSlots(false));
  }, [service, day]);

  async function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const payload = {
      ...Object.fromEntries(new FormData(form).entries()),
      service,
      type,
      scheduledAt: slot.iso,
    };
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't complete the booking.");
        if (res.status === 409) {
          // Slot taken — refresh times.
          setSlot(null);
          fetch(`/api/availability?service=${encodeURIComponent(service)}&date=${day}`)
            .then((r) => r.json())
            .then((d) => setSlots(d.slots ?? []));
        }
      } else {
        setConfirmed(data.when as string);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const svc = business.services.find((s) => s.key === service);
  const needsLocation = type === "home_call" || type === "in_home";

  if (confirmed) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="text-3xl">✅</div>
          <h1 className="mt-2 text-xl font-semibold text-green-900">You&apos;re booked!</h1>
          <p className="mt-2 text-sm text-green-800">
            {svc?.name} — {confirmed}
          </p>
          <p className="mt-1 text-sm text-green-700">
            A confirmation is on its way. See you at {business.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Book an appointment</h1>
          <p className="mt-1 text-sm text-slate-500">
            {business.name} · {business.location}
          </p>
        </div>

        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Step 1: service */}
          <div>
            <label htmlFor="service" className={label}>1. What do you need?</label>
            <select
              id="service"
              className={field}
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">Select a service…</option>
              {business.services
                .filter((s) => s.key !== "other")
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.category} — {s.name}
                    {s.price ? ` (${s.price})` : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* Step 2: day */}
          {service && (
            <div>
              <span className={label}>2. Pick a day</span>
              {loadingDays ? (
                <p className="mt-2 text-sm text-slate-400">Loading availability…</p>
              ) : days.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">
                  No openings in the next few weeks — please call us.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDay(d)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        day === d
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {dayLabel(d)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: time */}
          {day && (
            <div>
              <span className={label}>3. Pick a time</span>
              {loadingSlots ? (
                <p className="mt-2 text-sm text-slate-400">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No times left that day.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.iso}
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        slot?.iso === s.iso
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: details */}
          {slot && (
            <form onSubmit={book} className="space-y-4 border-t border-slate-100 pt-4">
              <span className={label}>4. Your details</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className={label}>Name</label>
                  <input id="name" name="name" required className={field} />
                </div>
                <div>
                  <label htmlFor="phone" className={label}>Phone</label>
                  <input id="phone" name="phone" className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="email" className={label}>Email</label>
                <input id="email" name="email" type="email" className={field} />
              </div>
              <div>
                <label htmlFor="type" className={label}>How?</label>
                <select
                  id="type"
                  className={field}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {business.appointmentTypes.map((t) => (
                    <option key={t.key} value={t.key}>{t.name}</option>
                  ))}
                </select>
              </div>
              {needsLocation && (
                <div>
                  <label htmlFor="location" className={label}>Your address</label>
                  <input id="location" name="location" className={field} />
                </div>
              )}
              <div>
                <label htmlFor="notes" className={label}>Anything we should know?</label>
                <textarea id="notes" name="notes" rows={2} className={field} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {pending ? "Booking…" : `Confirm — ${svc?.name}, ${slot.label}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
