"use client";

import { useState } from "react";
import { business } from "@/lib/business";

export default function PublicContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else {
        setSent(true);
        form.reset();
      }
    } catch {
      setError("Couldn't send your message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {business.location} · {business.turnaround}
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <p className="font-medium text-green-800">Thanks — your message is in!</p>
            <p className="mt-1 text-sm text-green-700">
              {business.owner} will get back to you fast.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-green-800 underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
              <label htmlFor="service" className={label}>What do you need?</label>
              <select id="service" name="service" className={field} defaultValue="">
                <option value="">Select a service…</option>
                {business.services.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.category} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="message" className={label}>Message</label>
              <textarea id="message" name="message" rows={4} required className={field} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
