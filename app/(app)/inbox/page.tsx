import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { hasApiKey } from "@/lib/claude";
import { SyncButton } from "./sync-button";
import { EmailCard, type EmailData } from "./email-card";

export default async function InboxPage() {
  const emails = await db.email.findMany({
    where: { status: { not: "archived" } },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  const data: EmailData[] = emails.map((e) => ({
    id: e.id,
    fromName: e.fromName,
    fromEmail: e.fromEmail,
    subject: e.subject,
    bodyText: e.bodyText,
    receivedAt: e.receivedAt.toISOString(),
    summary: e.summary,
    category: e.category,
    priority: e.priority,
    draftReply: e.draftReply,
    status: e.status,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Triaged mail with draft replies — you approve before anything sends.
          </p>
        </div>
        <SyncButton />
      </div>

      {!mailConfigured() && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No mailbox connected yet. Add <code>MAIL_USER</code> and <code>MAIL_APP_PASSWORD</code> to
          your <code>.env</code> (Yahoo or Gmail app password), then hit “Check mail.”
        </div>
      )}
      {mailConfigured() && !hasApiKey() && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Mailbox connected, but the AI needs <code>ANTHROPIC_API_KEY</code> to summarize and draft replies.
        </div>
      )}

      {data.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          No mail yet. Hit “Check mail” to pull your latest messages.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((e) => (
            <EmailCard key={e.id} email={e} />
          ))}
        </ul>
      )}
    </div>
  );
}
