import { runChat, type AiTool, type ChatMessage, type ToolEvent } from "./ai";
import { db } from "./db";
import { createBooking } from "./booking";
import { generateQuote } from "./quote";
import { getAvailableSlots, getOpenDays, parseLocalDate } from "./availability";
import { notifyOwner } from "./notify";
import { business, businessSummary, serviceName } from "./business";

function systemPrompt(): string {
  const now = new Date();
  return [
    `You are the friendly virtual assistant on the website of ${business.name} in ${business.location}. You're talking to a potential customer (a website visitor), not the owner. Be warm, helpful, and concise — like a knowledgeable front-desk rep.`,
    "",
    "Here's what you know about the business:",
    "",
    businessSummary(),
    "",
    `Current date/time: ${now.toString()}. Resolve relative dates ("tomorrow", "Saturday") against this.`,
    "",
    "Your goals, in order:",
    "1. Answer the visitor's questions about services, pricing, and how things work.",
    "2. If they want a price estimate — a PC build, a repair, or a website — use get_quote. Try to get their name and a phone or email first so it reaches the owner.",
    "3. If they want service, help them book an appointment right here in the chat.",
    "4. If they're not ready for either but want a callback, capture their contact info.",
    "",
    "Booking flow:",
    "- Figure out which service they need (map it to a service key).",
    "- Use check_availability to find open days/times — never invent times; only offer what it returns.",
    "- Collect their name and a phone number or email so we can confirm.",
    "- Read the details back, then use book_appointment.",
    "",
    "Guidelines:",
    "- Prices shown are the published rates; parts/hardware are extra. Frame anything beyond the flat tier as an estimate — a diagnostic confirms the final cost.",
    "- Don't expose the shop's full calendar — only share the open slots check_availability gives you.",
    "- If you can't help or they want a human, use capture_lead. Don't make up phone numbers, hours, or details you don't have.",
    "- Keep replies short and easy to read.",
  ].join("\n");
}

const serviceKeys = business.services.map((s) => s.key).join(", ");

const tools: AiTool[] = [
  {
    name: "check_availability",
    description:
      "Find open appointment times. Call with just a service to get open days, then again with a specific date to get times on that day. Only offer times this returns.",
    parameters: {
      type: "object",
      properties: {
        service: { type: "string", description: `Service key. One of: ${serviceKeys}.` },
        date: { type: "string", description: "A specific day as YYYY-MM-DD. Omit to list open days." },
      },
      required: ["service"],
    },
  },
  {
    name: "book_appointment",
    description: "Book once you have the service, a specific time, the customer's name, and a phone or email. Confirm details first.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        service: { type: "string", description: `Service key. One of: ${serviceKeys}.` },
        type: { type: "string", description: "How: dropoff, pickup, in_store, home_call, remote, or phone." },
        scheduledAt: { type: "string", description: "ISO 8601 start time from check_availability." },
        phone: { type: "string" },
        email: { type: "string" },
        location: { type: "string", description: "Address, required for home_call." },
        notes: { type: "string" },
      },
      required: ["name", "service", "scheduledAt"],
    },
  },
  {
    name: "get_quote",
    description:
      "Generate a price estimate for a PC build, a repair/parts replacement, or a website. Describe what the customer wants. Also sends the quote to the owner, so collect the customer's name and a phone or email first if you can.",
    parameters: {
      type: "object",
      properties: {
        request: { type: "string", description: "What to quote, in plain language." },
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
      },
      required: ["request"],
    },
  },
  {
    name: "capture_lead",
    description: "Save the visitor's info so the owner can follow up. Use when they don't want to book or get a quote right now.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        service: { type: "string", description: `Service key they're interested in, if any. One of: ${serviceKeys}.` },
        message: { type: "string", description: "What they want / their question." },
      },
      required: ["name", "message"],
    },
  },
];

async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: string; event: ToolEvent }> {
  if (name === "check_availability") {
    const service = String(input.service ?? "");
    if (!business.services.some((s) => s.key === service)) {
      return { result: `Unknown service "${service}".`, event: { tool: name, summary: "Checked availability" } };
    }
    if (!input.date) {
      const days = await getOpenDays(service);
      return {
        result: days.length ? `Open days for ${serviceName(service)}: ${days.join(", ")}` : "No openings in the next few weeks.",
        event: { tool: name, summary: `Checked open days for ${serviceName(service)}` },
      };
    }
    const slots = await getAvailableSlots(service, parseLocalDate(String(input.date)));
    const lines = slots.map((s) => `${s.toISOString()} (${s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })})`);
    return {
      result: lines.length ? `Open times on ${input.date}:\n${lines.join("\n")}` : `No open times on ${input.date}.`,
      event: { tool: name, summary: `Checked times on ${input.date}` },
    };
  }

  if (name === "book_appointment") {
    const result = await createBooking({
      name: String(input.name ?? ""),
      service: String(input.service ?? ""),
      type: input.type ? String(input.type) : undefined,
      scheduledAt: String(input.scheduledAt ?? ""),
      phone: input.phone ? String(input.phone) : null,
      email: input.email ? String(input.email) : null,
      location: input.location ? String(input.location) : null,
      notes: input.notes ? String(input.notes) : null,
      source: "chat",
    });
    if (!result.ok) {
      return { result: `Could not book: ${result.error}`, event: { tool: name, summary: "Booking attempt failed" } };
    }
    return {
      result: `Booked! ${input.name} — ${serviceName(String(input.service))} on ${result.when}.`,
      event: { tool: name, summary: `Booked ${input.name} — ${result.when}` },
    };
  }

  if (name === "get_quote") {
    const q = await generateQuote(String(input.request ?? ""), {
      name: input.name ? String(input.name) : undefined,
      phone: input.phone ? String(input.phone) : undefined,
      email: input.email ? String(input.email) : undefined,
    });
    const parts = q.computed.lines.map((l) => `- ${l.qty}× ${l.name}: $${l.lineTotal.toFixed(2)}`).join("\n");
    const breakdown = [
      q.summary,
      parts,
      q.computed.partsCharge > 0 ? `Parts: $${q.computed.partsCharge.toFixed(2)}` : "",
      q.computed.tax > 0 ? `Parts tax: $${q.computed.tax.toFixed(2)}` : "",
      q.computed.labor > 0 ? `Labor: $${q.computed.labor.toFixed(2)}` : "",
      `Estimated total: $${q.computed.total.toFixed(2)}`,
      q.assumptions ? `Assumptions: ${q.assumptions}` : "",
      "(Present this as an estimate. It's already been saved and sent to the owner.)",
    ]
      .filter(Boolean)
      .join("\n");
    return { result: breakdown, event: { tool: name, summary: `Quoted: ${q.summary} — $${q.computed.total.toFixed(2)}` } };
  }

  if (name === "capture_lead") {
    await db.contactMessage.create({
      data: {
        name: String(input.name ?? "Website visitor"),
        phone: input.phone ? String(input.phone) : null,
        email: input.email ? String(input.email) : null,
        service: input.service ? String(input.service) : null,
        message: String(input.message ?? ""),
        source: "chat",
      },
    });
    notifyOwner(
      "New chat lead",
      [
        `${input.name ?? "A visitor"} left their info via the website chat.`,
        input.phone ? `Phone: ${input.phone}` : null,
        input.email ? `Email: ${input.email}` : null,
        `Message: ${input.message ?? ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ).catch(() => {});
    return { result: "Saved — the owner will follow up.", event: { tool: name, summary: `Captured lead: ${input.name}` } };
  }

  return { result: `Unknown tool ${name}`, event: { tool: name, summary: "Unknown tool" } };
}

/** Run the public (customer-facing) assistant over a conversation. */
export async function runPublicAssistant(
  history: ChatMessage[],
): Promise<{ text: string; events: ToolEvent[] }> {
  const { text, events } = await runChat({
    system: systemPrompt(),
    messages: history,
    tools,
    runTool,
    maxTokens: 1200,
  });
  return { text: text || "Sorry — could you rephrase that?", events };
}
