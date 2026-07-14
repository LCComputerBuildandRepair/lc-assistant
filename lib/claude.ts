import { db } from "./db";
import { runChat, hasAI, type AiTool, type ChatMessage, type ToolEvent } from "./ai";
import { business, businessSummary, serviceName, appointmentTypeName } from "./business";

// Re-export shared types so existing imports keep working.
export type { ChatMessage, ToolEvent } from "./ai";

/** True when an AI provider key is configured. */
export function hasApiKey(): boolean {
  return hasAI();
}

function systemPrompt(): string {
  const now = new Date();
  return [
    `You are the assistant for ${business.name}, a computer build and repair business. You help ${business.owner}, the owner, manage the business — answering questions, scheduling appointments, and drafting communication in the owner's voice.`,
    "",
    "Here is everything you know about the business:",
    "",
    businessSummary(),
    "",
    `The current date and time is ${now.toString()}. Use this to resolve relative dates like "tomorrow" or "next Tuesday". The shop is closed on days marked Closed above — don't book then without flagging it.`,
    "",
    "How to work:",
    "- Be warm, concise, and practical — like a knowledgeable shop owner, not a corporate bot.",
    "- When booking an appointment, make sure you have: the customer's name, what they need (service), how it'll happen (in-store, drop-off, in-home, phone), and a date/time. If something's missing, ask — don't guess. A phone number is helpful; ask for it but don't hard-require it.",
    "- Before booking, briefly confirm the details back to the owner, then use the create_appointment tool.",
    "- Use get_appointments to check the schedule before suggesting times, and to answer 'what's on for today/this week'.",
    "- For in-home visits, confirm an address.",
    "- You can help draft emails and replies, explain repairs in plain language, and give rough guidance — but never quote an exact price as final; frame pricing as an estimate pending a diagnostic.",
    "- If you don't know a business detail (exact price, an address), say so rather than inventing it.",
  ].join("\n");
}

const tools: AiTool[] = [
  {
    name: "get_appointments",
    description:
      "List appointments from the schedule, optionally filtered by date range and status. Use this to check the calendar before suggesting times or to answer what's coming up.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start of range, ISO 8601. Optional; defaults to now." },
        to: { type: "string", description: "End of range, ISO 8601. Optional; defaults to 14 days from `from`." },
        status: { type: "string", description: "Optional status filter: scheduled, confirmed, in_progress, completed, cancelled, or no_show." },
      },
    },
  },
  {
    name: "create_appointment",
    description: "Book a new appointment on the schedule. Only call this after confirming the details with the owner.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        customerEmail: { type: "string" },
        serviceType: { type: "string", description: "One of: essential_care, performance_care, ultimate_care, custom_build, home_essential, home_performance, home_pro, pos_diagnostics, pos_setup, pos_migration, commercial_it, web_landing, web_small_business, web_custom, other." },
        type: { type: "string", description: "How it happens: dropoff, pickup, in_store, home_call, remote, or phone." },
        scheduledAt: { type: "string", description: "Date and time, ISO 8601 (e.g. 2026-07-15T14:00:00)." },
        durationMin: { type: "number" },
        location: { type: "string", description: "Address, required for home_call visits." },
        notes: { type: "string" },
      },
      required: ["customerName", "serviceType", "type", "scheduledAt"],
    },
  },
];

async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: string; event: ToolEvent }> {
  if (name === "get_appointments") {
    const from = input.from ? new Date(String(input.from)) : new Date();
    const to = input.to
      ? new Date(String(input.to))
      : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    const where: Record<string, unknown> = { scheduledAt: { gte: from, lte: to } };
    if (input.status) where.status = String(input.status);
    const appts = await db.appointment.findMany({ where, orderBy: { scheduledAt: "asc" }, take: 100 });
    const lines = appts.map(
      (a) =>
        `${a.scheduledAt.toISOString()} — ${a.customerName} — ${serviceName(a.serviceType)} (${appointmentTypeName(a.type)}) — ${a.status}`,
    );
    return {
      result: lines.length ? lines.join("\n") : "No appointments in that range.",
      event: { tool: name, summary: `Checked the schedule (${appts.length} found)` },
    };
  }

  if (name === "create_appointment") {
    const appt = await db.appointment.create({
      data: {
        customerName: String(input.customerName),
        customerPhone: input.customerPhone ? String(input.customerPhone) : null,
        customerEmail: input.customerEmail ? String(input.customerEmail) : null,
        serviceType: String(input.serviceType),
        type: String(input.type),
        scheduledAt: new Date(String(input.scheduledAt)),
        durationMin: input.durationMin ? Number(input.durationMin) : 60,
        location: input.location ? String(input.location) : null,
        notes: input.notes ? String(input.notes) : null,
        source: "assistant",
      },
    });
    return {
      result: `Booked. Appointment id ${appt.id} for ${appt.customerName} at ${appt.scheduledAt.toISOString()}.`,
      event: { tool: name, summary: `Booked ${appt.customerName} — ${serviceName(appt.serviceType)} on ${appt.scheduledAt.toLocaleString()}` },
    };
  }

  return { result: `Unknown tool: ${name}`, event: { tool: name, summary: "Unknown tool" } };
}

/** Run the owner assistant over a conversation. */
export async function runAssistant(
  history: ChatMessage[],
): Promise<{ text: string; events: ToolEvent[] }> {
  const { text, events } = await runChat({
    system: systemPrompt(),
    messages: history,
    tools,
    runTool,
    maxTokens: 1400,
  });
  return { text: text || "(no response)", events };
}
