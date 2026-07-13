import Link from "next/link";
import { business } from "@/lib/business";
import { createAppointment } from "../actions";

const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const label = "block text-sm font-medium text-slate-700";

export default function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/appointments" className="hover:text-slate-900">
          Appointments
        </Link>
        <span>/</span>
        <span className="text-slate-900">New</span>
      </div>
      <h1 className="text-xl font-semibold">New appointment</h1>

      <form action={createAppointment} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label htmlFor="customerName" className={label}>Customer name</label>
          <input id="customerName" name="customerName" required className={field} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerPhone" className={label}>Phone</label>
            <input id="customerPhone" name="customerPhone" className={field} />
          </div>
          <div>
            <label htmlFor="customerEmail" className={label}>Email</label>
            <input id="customerEmail" name="customerEmail" type="email" className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="serviceType" className={label}>Service</label>
            <select id="serviceType" name="serviceType" className={field} defaultValue="essential_care">
              {business.services.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.category} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className={label}>Type</label>
            <select id="type" name="type" className={field} defaultValue="dropoff">
              {business.appointmentTypes.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduledAt" className={label}>Date &amp; time</label>
            <input id="scheduledAt" name="scheduledAt" type="datetime-local" required className={field} />
          </div>
          <div>
            <label htmlFor="durationMin" className={label}>Duration (min)</label>
            <input id="durationMin" name="durationMin" type="number" defaultValue={60} min={5} step={5} className={field} />
          </div>
        </div>

        <div>
          <label htmlFor="location" className={label}>Location <span className="text-slate-400">(for in-home visits)</span></label>
          <input id="location" name="location" className={field} />
        </div>

        <div>
          <label htmlFor="notes" className={label}>Notes</label>
          <textarea id="notes" name="notes" rows={3} className={field} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Book appointment
          </button>
          <Link href="/appointments" className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
