import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/session";
import { runAssistant, hasApiKey, type ChatMessage } from "@/lib/claude";

export async function POST(request: Request) {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "The assistant isn't configured yet — add ANTHROPIC_API_KEY to .env." },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  );
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  try {
    const { text, events } = await runAssistant(messages);
    return NextResponse.json({ text, events });
  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The assistant hit an error." },
      { status: 500 },
    );
  }
}
