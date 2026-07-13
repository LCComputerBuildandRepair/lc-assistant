"use client";

import { useTransition } from "react";
import { setMessageStatus } from "./actions";

export function MessageActions({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition();

  function set(s: string) {
    startTransition(() => setMessageStatus(id, s));
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
        {status}
      </span>
      {status !== "read" && status !== "archived" && (
        <button
          disabled={pending}
          onClick={() => set("read")}
          className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Mark read
        </button>
      )}
      {status !== "archived" && (
        <button
          disabled={pending}
          onClick={() => set("archived")}
          className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Archive
        </button>
      )}
    </div>
  );
}
