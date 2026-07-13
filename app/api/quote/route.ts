import { NextResponse } from "next/server";
import { generateQuote } from "@/lib/quote";
import { hasApiKey } from "@/lib/claude";

const cors = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Quotes are expensive (web search + model), so limit tighter than chat.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
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
      { error: "Live quotes aren't available right now." },
      { status: 503, headers: cors },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "You've requested several quotes — please try again in a bit." },
      { status: 429, headers: cors },
    );
  }

  let body: { request?: string; name?: string; phone?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: cors });
  }

  const req = String(body.request ?? "").trim().slice(0, 1500);
  if (req.length < 3) {
    return NextResponse.json(
      { error: "Tell us what you'd like a quote for." },
      { status: 400, headers: cors },
    );
  }

  try {
    const q = await generateQuote(req, {
      name: body.name?.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim(),
    });
    // Customer-safe response — no cost basis or margin.
    return NextResponse.json(
      {
        ok: true,
        id: q.id,
        kind: q.kind,
        summary: q.summary,
        assumptions: q.assumptions,
        lines: q.computed.lines.map((l) => ({
          name: l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
          retailer: l.retailer,
        })),
        partsCharge: q.computed.partsCharge,
        tax: q.computed.tax,
        labor: q.computed.labor,
        total: q.computed.total,
      },
      { status: 201, headers: cors },
    );
  } catch (err) {
    console.error("Quote error:", err);
    return NextResponse.json(
      { error: "Couldn't build that quote. Please try rephrasing or contact us." },
      { status: 500, headers: cors },
    );
  }
}
