"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Hi! 👋 I'm the assistant for LC Computer Build & Repair. Ask me anything about repairs, custom builds, or websites — or I can book you an appointment right here.";

export default function WidgetPage() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Drop the local greeting; only send the real exchange.
        body: JSON.stringify({ messages: next.filter((m) => m.content !== GREETING) }),
      });
      const data = await res.json();
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: res.ok ? data.text : data.error ?? "Sorry, something went wrong.",
        },
      ]);
    } catch {
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: "I couldn't reach the shop right now — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="text-sm font-semibold">LC Computer Build &amp; Repair</div>
        <div className="text-xs text-slate-300">Mansfield, Ohio · Ask us anything</div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white"
                  : "max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800"
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">Typing…</div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
