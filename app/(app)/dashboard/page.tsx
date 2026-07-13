import Link from "next/link";
import { db } from "@/lib/db";
import { business, serviceName, appointmentTypeName } from "@/lib/business";
import { hasApiKey } from "@/lib/claude";

function timeOnly(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default async function DashboardPage() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [today, weekCount, openCount] = await Promise.all([
    db.appointment.findMany({
      where: { scheduledAt: { gte: startOfDay, lt: endOfDay } },
      orderBy: { scheduledAt: "asc" },
    }),
    db.appointment.count({ where: { scheduledAt: { gte: startOfDay, lt: weekEnd } } }),
    db.appointment.count({
      where: { status: { in: ["scheduled", "confirmed", "in_progress"] } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold">
        {greeting()}, {business.owner}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      {!hasApiKey() && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          The AI assistant needs an Anthropic API key. Add <code>ANTHROPIC_API_KEY</code> to your
          <code> .env</code> file to turn it on.
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Today" value={today.length} />
        <Stat label="This week" value={weekCount} />
        <Stat label="Open jobs" value={openCount} />
      </div>

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Today&apos;s schedule
          </h2>
          <Link href="/appointments" className="text-sm text-slate-600 hover:text-slate-900">
            View all →
          </Link>
        </div>
        {today.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            Nothing scheduled today.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {today.map((a) => (
              <li key={a.id} className="flex items-center gap-4 p-4">
                <div className="w-20 text-sm font-medium">{timeOnly(a.scheduledAt)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.customerName}</div>
                  <div className="text-xs text-slate-500">
                    {serviceName(a.serviceType)} · {appointmentTypeName(a.type)}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                  {a.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex gap-3">
        <Link
          href="/assistant"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Ask the assistant
        </Link>
        <Link
          href="/appointments/new"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          New appointment
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
