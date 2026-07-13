import { NextResponse } from "next/server";
import { runPublicAssistant } from "@/lib/public-assistant";
import { hasApiKey, type ChatMessage } from "@/lib/claude";

const cors = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Simple in-memory rate limiter (per IP). Resets on restart; fine for a single
// instance. Swap for a shared store if you scale horizontally.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "The assistant isn't available right now." },
      { status: 503, headers: cors },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many messages — please slow down a moment." },
      { status: 429, headers: cors },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: cors });
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-24) // cap history length
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })); // cap message size

  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400, headers: cors });
  }

  try {
    const { text, events } = await runPublicAssistant(messages);
    return NextResponse.json({ text, events }, { headers: cors });
  } catch (err) {
    console.error("Public chat error:", err);
    return NextResponse.json(
      { error: "Sorry, something went wrong. Please try again." },
      { status: 500, headers: cors },
    );
  }
}
