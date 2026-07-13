import { db } from "@/lib/db";

interface Line {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  retailer?: string;
}

function fmt(d: Date): string {
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
const money = (n: number) => `$${n.toFixed(2)}`;

export default async function QuotesPage() {
  const quotes = await db.quote.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Quotes</h1>
      <p className="mt-1 text-sm text-slate-500">Estimates generated for customers — with your margin.</p>

      {quotes.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No quotes yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {quotes.map((q) => {
            let lines: Line[] = [];
            try {
              lines = JSON.parse(q.itemsJson);
            } catch {}
            return (
              <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{q.summary || q.request}</div>
                    <div className="text-xs text-slate-500">
                      <span className="capitalize">{q.kind}</span>
                      {q.customerName ? ` · ${q.customerName}` : ""}
                      {q.customerPhone ? ` · ${q.customerPhone}` : ""}
                      {q.customerEmail ? ` · ${q.customerEmail}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{money(q.total)}</div>
                    <div className="text-xs text-slate-400">{fmt(q.createdAt)}</div>
                  </div>
                </div>

                {lines.length > 0 && (
                  <ul className="mt-3 space-y-0.5 text-xs text-slate-600">
                    {lines.map((l, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{l.qty}× {l.name}{l.retailer ? ` · ${l.retailer}` : ""}</span>
                        <span>{money(l.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-xs">
                  {q.partsCharge > 0 && <span className="text-slate-500">Parts {money(q.partsCharge)}</span>}
                  {q.tax > 0 && <span className="text-slate-500">Tax {money(q.tax)}</span>}
                  <span className="text-slate-500">Labor {money(q.labor)}</span>
                  <span className="font-medium text-green-700">
                    Your take ≈ {money(q.marginEstimate)}
                  </span>
                  <span className="text-slate-400">(parts cost ≈ {money(q.partsCost)})</span>
                </div>

                {q.assumptions && <p className="mt-2 text-xs text-slate-400">{q.assumptions}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
