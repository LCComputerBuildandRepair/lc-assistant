import { NextResponse } from "next/server";
import { getAvailableSlots, getOpenDays, parseLocalDate, toYMD } from "@/lib/availability";
import { serviceName } from "@/lib/business";

const cors = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const service = url.searchParams.get("service");
  const date = url.searchParams.get("date");

  if (!service) {
    return NextResponse.json({ error: "Missing service." }, { status: 400, headers: cors });
  }

  // No date → return the list of open days.
  if (!date) {
    const days = await getOpenDays(service);
    return NextResponse.json(
      { service, serviceName: serviceName(service), days },
      { headers: cors },
    );
  }

  const day = parseLocalDate(date);
  const slots = await getAvailableSlots(service, day);
  return NextResponse.json(
    {
      service,
      date: toYMD(day),
      slots: slots.map((s) => ({
        iso: s.toISOString(),
        label: s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      })),
    },
    { headers: cors },
  );
}
