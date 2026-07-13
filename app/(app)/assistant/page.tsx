"use client";

import { useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  events?: { tool: string; summary: string }[];
}

const SUGGESTIONS = [
  "What's on the schedule this week?",
  "Book Sarah for a laptop diagnostic tomorrow at 2pm, drop-off.",
  "Draft a reply to a customer asking if we do screen replacements.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setMessages((cur) => [
          ...cur,
          { role: "assistant", content: data.text, events: data.events },
        ]);
      }
    } catch {
      setError("Couldn't reach the assistant.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <h1 className="text-xl font-semibold">Assistant</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ask about the schedule, book appointments, or draft replies.
      </p>

      <div
        ref={scrollRef}
        className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-2 pt-4">
            <p className="text-center text-sm text-slate-400">Try one of these:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white"
                  : "max-w-[85%] rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800"
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.events && m.events.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                  {m.events.map((e, j) => (
                    <div key={j} className="text-xs text-slate-500">
                      ✓ {e.summary}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-400">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the assistant…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
