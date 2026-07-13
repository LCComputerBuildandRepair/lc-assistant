"use client";

import { useState, useTransition } from "react";
import { sendEmailReply, setEmailStatus } from "./actions";

export interface EmailData {
  id: string;
  fromName: string | null;
  fromEmail: string;
  subject: string | null;
  bodyText: string;
  receivedAt: string;
  summary: string | null;
  category: string | null;
  priority: string | null;
  draftReply: string | null;
  status: string;
}

const priorityColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  normal: "bg-slate-100 text-slate-600",
  low: "bg-slate-100 text-slate-400",
};

export function EmailCard({ email }: { email: EmailData }) {
  const [draft, setDraft] = useState(email.draftReply ?? "");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const replied = email.status === "replied";

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendEmailReply(email.id, draft);
      if (res.error) setError(res.error);
    });
  }
  function archive() {
    startTransition(() => setEmailStatus(email.id, "archived"));
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{email.fromName || email.fromEmail}</span>
            {email.priority && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${priorityColor[email.priority] ?? priorityColor.normal}`}>
                {email.priority}
              </span>
            )}
            {email.category && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
                {email.category}
              </span>
            )}
            {replied && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">replied</span>}
          </div>
          <div className="truncate text-sm text-slate-700">{email.subject || "(no subject)"}</div>
        </div>
        <div className="whitespace-nowrap text-xs text-slate-400">
          {new Date(email.receivedAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>

      {email.summary && <p className="mt-2 text-sm text-slate-600">{email.summary}</p>}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs text-slate-400 hover:text-slate-700"
      >
        {expanded ? "Hide message" : "Show full message"}
      </button>
      {expanded && (
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {email.bodyText}
        </pre>
      )}

      {!replied && (
        <div className="mt-3">
          <label className="text-xs font-medium text-slate-500">
            Suggested reply {email.draftReply ? "(drafted for you — edit as needed)" : ""}
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="Write a reply…"
            className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={send}
              disabled={pending || !draft.trim()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : `Send to ${email.fromEmail}`}
            </button>
            <button
              onClick={archive}
              disabled={pending}
              className="text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
