import Link from "next/link";
import { db } from "@/lib/db";
import { serviceName, appointmentTypeName } from "@/lib/business";
import { StatusSelect } from "./status-select";

function fmt(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AppointmentsPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcoming = await db.appointment.findMany({
    where: { scheduledAt: { gte: startOfToday } },
    orderBy: { scheduledAt: "asc" },
  });
  const past = await db.appointment.findMany({
    where: { scheduledAt: { lt: startOfToday } },
    orderBy: { scheduledAt: "desc" },
    take: 25,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Link
          href="/appointments/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New appointment
        </Link>
      </div>

      <Section title="Upcoming" appts={upcoming} empty="Nothing on the schedule yet." />
      {past.length > 0 && <Section title="Past" appts={past} empty="" />}
    </div>
  );
}

function Section({
  title,
  appts,
  empty,
}: {
  title: string;
  appts: Awaited<ReturnType<typeof db.appointment.findMany>>;
  empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {appts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {appts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-[9rem] text-sm font-medium">{fmt(a.scheduledAt)}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{a.customerName}</div>
                <div className="text-xs text-slate-500">
                  {serviceName(a.serviceType)} · {appointmentTypeName(a.type)}
                  {a.customerPhone ? ` · ${a.customerPhone}` : ""}
                </div>
                {a.notes && <div className="mt-1 text-xs text-slate-400">{a.notes}</div>}
              </div>
              <StatusSelect id={a.id} status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
