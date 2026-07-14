import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyOwner } from "@/lib/notify";
import { serviceName } from "@/lib/business";

// Public endpoint — the website's contact form posts here from another origin,
// so we send permissive CORS headers.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      data = Object.fromEntries(form.entries());
    }
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400, headers: corsHeaders() });
  }

  const name = String(data.name ?? "").trim();
  const message = String(data.message ?? "").trim();
  if (!name || !message) {
    return NextResponse.json(
      { error: "Name and message are required." },
      { status: 400, headers: corsHeaders() },
    );
  }

  const email = str(data.email);
  const phone = str(data.phone);
  const service = str(data.service);

  const saved = await db.contactMessage.create({
    data: { name, email, phone, service, message },
  });

  // Notify the owner by text + email. Failures here don't fail the submission.
  const serviceLabel = service ? serviceName(service) : null;
  const lines = [
    `New message from ${name}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    serviceLabel ? `Service: ${serviceLabel}` : null,
    "",
    message,
  ].filter((l) => l !== null);
  await notifyOwner("New website message", lines.join("\n")).catch((e) =>
    console.error("notifyOwner failed:", e),
  );

  return NextResponse.json(
    { ok: true, id: saved.id },
    { status: 201, headers: corsHeaders() },
  );
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
