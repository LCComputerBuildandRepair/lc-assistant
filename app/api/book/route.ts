import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking";

const cors = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: cors });
  }

  const result = await createBooking({
    name: String(data.name ?? ""),
    service: String(data.service ?? ""),
    type: data.type ? String(data.type) : undefined,
    scheduledAt: String(data.scheduledAt ?? ""),
    phone: str(data.phone),
    email: str(data.email),
    location: str(data.location),
    notes: str(data.notes),
    source: "website",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers: cors });
  }
  return NextResponse.json(
    { ok: true, id: result.id, when: result.when },
    { status: 201, headers: cors },
  );
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
