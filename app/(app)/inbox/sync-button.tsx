"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMsg(data.error ?? "Sync failed.");
      else {
        setMsg(data.created > 0 ? `${data.created} new email${data.created === 1 ? "" : "s"}.` : "Up to date.");
        router.refresh();
      }
    } catch {
      setMsg("Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button
        onClick={sync}
        disabled={busy}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Check mail"}
      </button>
    </div>
  );
}
