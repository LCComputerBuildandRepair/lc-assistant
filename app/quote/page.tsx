"use client";

import { useState } from "react";
import { business } from "@/lib/business";

interface Line {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  retailer?: string;
}
interface Quote {
  kind: string;
  summary: string;
  assumptions: string;
  lines: Line[];
  partsCharge: number;
  tax: number;
  labor: number;
  total: number;
}

const EXAMPLES = [
  "Build me a gaming PC for about $1,200",
  "Replace my laptop screen and battery (Dell XPS 13)",
  "I need a small business website for my landscaping company",
];

const field =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
const label = "block text-sm font-medium text-slate-700";
const money = (n: number) => `$${n.toFixed(2)}`;

export default function QuotePage() {
  const [request, setRequest] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  async function getQuote() {
    if (request.trim().length < 3 || loading) return;
    setError(null);
    setQuote(null);
    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, name, phone, email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setQuote(data as Quote);
    } catch {
      setError("Couldn't build the estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Get an instant estimate</h1>
          <p className="mt-1 text-sm text-slate-500">
            {business.name} · builds, repairs &amp; websites
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="request" className={label}>What do you need?</label>
            <textarea
              id="request"
              rows={3}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="e.g. Build a gaming PC for around $1,200"
              className={field}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setRequest(ex)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="name" className={label}>Name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="phone" className={label}>Phone</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="email" className={label}>Email</label>
              <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
          </div>

          <button
            onClick={getQuote}
            disabled={loading || request.trim().length < 3}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Building your estimate…" : "Get my estimate"}
          </button>
          {loading && (
            <p className="text-center text-xs text-slate-400">
              Researching current prices — this takes a few seconds.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {quote && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{quote.summary}</h2>

            {quote.lines.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {quote.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2">
                        <div className="font-medium">{l.name}</div>
                        {l.retailer && <div className="text-xs text-slate-400">{l.retailer}</div>}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {l.qty} × {money(l.unitPrice)}
                      </td>
                      <td className="py-2 pl-3 text-right font-medium">{money(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 space-y-1 border-t border-slate-200 pt-4 text-sm">
              {quote.partsCharge > 0 && (
                <Row label="Parts" value={money(quote.partsCharge)} />
              )}
              {quote.tax > 0 && <Row label="Parts tax" value={money(quote.tax)} />}
              {quote.labor > 0 && <Row label="Labor" value={money(quote.labor)} />}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                <span>Estimated total</span>
                <span>{money(quote.total)}</span>
              </div>
            </div>

            {quote.assumptions && (
              <p className="mt-4 text-xs text-slate-500">{quote.assumptions}</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              This is an estimate. Final pricing is confirmed after we review the details.
              We&apos;ve saved your request — {business.owner} will be in touch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
