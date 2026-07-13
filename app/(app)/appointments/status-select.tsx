"use client";

import { useTransition } from "react";
import { setAppointmentStatus } from "./actions";

const STATUSES = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
];

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => setAppointmentStatus(id, e.target.value))
      }
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs capitalize outline-none focus:border-slate-900 disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
