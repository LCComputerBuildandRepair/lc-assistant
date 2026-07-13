import { db } from "@/lib/db";
import { serviceName } from "@/lib/business";
import { MessageActions } from "./message-actions";

function fmt(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MessagesPage() {
  const messages = await db.contactMessage.findMany({
    where: { status: { not: "archived" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">Enquiries from your website contact form.</p>

      {messages.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No messages yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border bg-white p-4 ${
                m.status === "new" ? "border-slate-900/20 ring-1 ring-slate-900/5" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-slate-500">
                    {[m.phone, m.email, m.service ? serviceName(m.service) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">{fmt(m.createdAt)}</div>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-3 text-xs">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="text-slate-500 hover:text-slate-900">
                      Reply by email
                    </a>
                  )}
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="text-slate-500 hover:text-slate-900">
                      Call
                    </a>
                  )}
                </div>
                <MessageActions id={m.id} status={m.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
