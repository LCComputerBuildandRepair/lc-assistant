import OpenAI from "openai";

/**
 * Provider-agnostic AI client (OpenAI-compatible).
 *
 * Works with any OpenAI-compatible API — set these env vars:
 *   AI_API_KEY   the provider key (required to enable the AI)
 *   AI_BASE_URL  provider endpoint (default: Groq, which is free)
 *   AI_MODEL     model id (default: a capable free Groq model)
 *
 * Free option (default): Groq — https://console.groq.com
 *   AI_BASE_URL = https://api.groq.com/openai/v1
 *   AI_MODEL    = llama-3.3-70b-versatile
 *
 * Switch to Claude later without code changes:
 *   AI_BASE_URL = https://api.anthropic.com/v1/
 *   AI_MODEL    = claude-opus-4-8
 *   AI_API_KEY  = your Anthropic key
 */

export function hasAI(): boolean {
  return !!process.env.AI_API_KEY;
}

export function aiModel(): string {
  return process.env.AI_MODEL || "llama-3.3-70b-versatile";
}

export function getAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
  });
}

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's parameters. */
  parameters: Record<string, unknown>;
}

export interface ToolEvent {
  tool: string;
  summary: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function toOpenAITools(tools: AiTool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/**
 * Run a chat with an agentic tool-use loop. `runTool` executes a tool call and
 * returns text to feed back plus an optional UI event. Returns the final text.
 */
export async function runChat(opts: {
  system: string;
  messages: ChatMessage[];
  tools?: AiTool[];
  runTool?: (name: string, args: Record<string, unknown>) => Promise<{ result: string; event?: ToolEvent }>;
  maxIters?: number;
  maxTokens?: number;
}): Promise<{ text: string; events: ToolEvent[] }> {
  const ai = getAI();
  const model = aiModel();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgs: any[] = [{ role: "system", content: opts.system }, ...opts.messages];
  const events: ToolEvent[] = [];
  const tools = opts.tools?.length ? toOpenAITools(opts.tools) : undefined;

  for (let i = 0; i < (opts.maxIters ?? 6); i++) {
    const res = await ai.chat.completions.create({
      model,
      messages: msgs,
      tools,
      tool_choice: tools ? "auto" : undefined,
      max_tokens: opts.maxTokens ?? 1400,
      temperature: 0.5,
    });
    const m = res.choices[0]?.message;
    if (!m) break;
    msgs.push(m);

    if (m.tool_calls && m.tool_calls.length && opts.runTool) {
      for (const tc of m.tool_calls) {
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* ignore malformed args */
        }
        try {
          const { result, event } = await opts.runTool(tc.function.name, args);
          if (event) events.push(event);
          msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
        } catch (err) {
          msgs.push({
            role: "tool",
            tool_call_id: tc.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
      continue;
    }

    return { text: (m.content || "").trim(), events };
  }
  return { text: "", events };
}

/**
 * Force the model to call one tool and return its parsed arguments — used for
 * structured output (quotes, email triage).
 */
export async function extractToolCall<T = Record<string, unknown>>(opts: {
  system: string;
  user: string;
  tool: AiTool;
  maxTokens?: number;
}): Promise<T> {
  const ai = getAI();
  const res = await ai.chat.completions.create({
    model: aiModel(),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    tools: toOpenAITools([opts.tool]),
    tool_choice: { type: "function", function: { name: opts.tool.name } },
    max_tokens: opts.maxTokens ?? 2000,
    temperature: 0.3,
  });
  const call = res.choices[0]?.message?.tool_calls?.find(
    (t) => t.type === "function" && t.function.name === opts.tool.name,
  );
  if (!call || call.type !== "function") {
    throw new Error("Model did not return the expected structured output.");
  }
  return JSON.parse(call.function.arguments || "{}") as T;
}
