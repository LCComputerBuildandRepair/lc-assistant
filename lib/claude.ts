import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { business, businessSummary, serviceName, appointmentTypeName } from "./business";

const MODEL = "claude-opus-4-8";

export function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment.
  return new Anthropic();
}

export function hasApiKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Roles we persist and exchange with the model. */
export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A record of a tool the assistant ran, surfaced to the UI. */
export interface ToolEvent {
  tool: string;
  summary: string;
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
    "- You can help draft emails and replies, explain repairs in plain language, and recommend a service tier. The tier prices above are the published rates; hourly overage applies as noted, and hardware/parts are extra — frame anything beyond the flat tier as an estimate.",
    "- Customers of the shop normally book online via Calendly (" + business.bookingUrl + "). When YOU book here, you're recording it on the owner's internal dashboard.",
    "- If you don't know a business detail (exact hours, a phone number — the shop hasn't published one), say so rather than inventing it.",
  ].join("\n");
}

const tools: Anthropic.Tool[] = [
  {
    name: "get_appointments",
    description:
      "List appointments from the schedule, optionally filtered by date range and status. Use this to check the calendar before suggesting times or to answer what's coming up.",
    input_schema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Start of range, ISO 8601 (e.g. 2026-07-13). Optional; defaults to now.",
        },
        to: {
          type: "string",
          description: "End of range, ISO 8601. Optional; defaults to 14 days from `from`.",
        },
        status: {
          type: "string",
          description:
            "Optional status filter: scheduled, confirmed, in_progress, completed, cancelled, or no_show.",
        },
      },
    },
  },
  {
    name: "create_appointment",
    description:
      "Book a new appointment on the schedule. Only call this after confirming the details with the owner.",
    input_schema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "The customer's name." },
        customerPhone: { type: "string", description: "The customer's phone number, if known." },
        customerEmail: { type: "string", description: "The customer's email, if known." },
        serviceType: {
          type: "string",
          description:
            "The service key. One of: essential_care, performance_care, ultimate_care, custom_build, home_essential, home_performance, home_pro, pos_diagnostics, pos_setup, pos_migration, commercial_it, web_landing, web_small_business, web_custom, other.",
        },
        type: {
          type: "string",
          description: "How it happens: dropoff, pickup, in_store, home_call, remote, or phone.",
        },
        scheduledAt: {
          type: "string",
          description: "Date and time of the appointment, ISO 8601 (e.g. 2026-07-15T14:00:00).",
        },
        durationMin: { type: "number", description: "Length in minutes. Optional." },
        location: { type: "string", description: "Address, required for in_home visits." },
        notes: { type: "string", description: "Anything else worth recording about the job." },
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
    const where: Record<string, unknown> = {
      scheduledAt: { gte: from, lte: to },
    };
    if (input.status) where.status = String(input.status);
    const appts = await db.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: 100,
    });
    const lines = appts.map(
      (a) =>
        `${a.scheduledAt.toISOString()} — ${a.customerName} — ${serviceName(a.serviceType)} (${appointmentTypeName(a.type)}) — ${a.status}`,
    );
    return {
      result: lines.length ? lines.join("\n") : "No appointments in that range.",
      event: { tool: "get_appointments", summary: `Checked the schedule (${appts.length} found)` },
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
      },
    });
    return {
      result: `Booked. Appointment id ${appt.id} for ${appt.customerName} at ${appt.scheduledAt.toISOString()}.`,
      event: {
        tool: "create_appointment",
        summary: `Booked ${appt.customerName} — ${serviceName(appt.serviceType)} on ${appt.scheduledAt.toLocaleString()}`,
      },
    };
  }

  return { result: `Unknown tool: ${name}`, event: { tool: name, summary: "Unknown tool" } };
}

/**
 * Run the assistant over a conversation and return its reply plus any actions taken.
 * Handles the full tool-use loop server-side.
 */
export async function runAssistant(
  history: ChatMessage[],
): Promise<{ text: string; events: ToolEvent[] }> {
  const client = getClient();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const events: ToolEvent[] = [];

  for (let i = 0; i < 8; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: systemPrompt(),
      tools,
      messages,
    });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (response.stop_reason === "tool_use" && toolUses.length > 0) {
      messages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        try {
          const { result, event } = await runTool(
            tu.name,
            (tu.input ?? {}) as Record<string, unknown>,
          );
          events.push(event);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error running ${tu.name}: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Final turn — collect text.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { text: text || "(no response)", events };
  }

  return { text: "I got stuck in a loop — let's try that again.", events };
}
