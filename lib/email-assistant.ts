import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "./claude";
import { business, businessSummary } from "./business";

const MODEL = "claude-opus-4-8";

export interface Triage {
  summary: string;
  category: string;
  priority: string;
  draftReply: string;
}

const triageTool: Anthropic.Tool = {
  name: "submit_triage",
  description: "Submit the triage result for an email.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One-line summary of what the email is about and what's needed." },
      category: {
        type: "string",
        description: "One of: inquiry, booking, quote, complaint, spam, personal, other.",
      },
      priority: { type: "string", description: "high, normal, or low." },
      draftReply: {
        type: "string",
        description:
          "A ready-to-send reply in the owner's voice. Empty string if no reply is needed (e.g. spam or newsletters).",
      },
    },
    required: ["summary", "category", "priority", "draftReply"],
  },
};

function systemPrompt(): string {
  return [
    `You triage incoming email for ${business.name} in ${business.location}. The owner is ${business.owner}. Your job: quickly summarize each email, categorize and prioritize it, and draft a reply in ${business.owner}'s voice for him to approve.`,
    "",
    "About the business (for accurate replies):",
    businessSummary(),
    "",
    "Voice for drafts: warm, straightforward, and concise — like a trusted local shop owner. Get to the point, be helpful, and sign off as " +
      `${business.owner} / ${business.name}. Don't over-promise exact prices — frame them as estimates pending a look. If the email is spam, a newsletter, or needs no reply, leave draftReply empty.`,
    "",
    "Priority: high = an unhappy customer, an urgent job, or a time-sensitive opportunity; low = newsletters/spam/FYI; normal = everything else.",
  ].join("\n");
}

/** Triage a single email into summary, category, priority, and a draft reply. */
export async function triageEmail(email: {
  fromName: string | null;
  fromEmail: string;
  subject: string | null;
  bodyText: string;
}): Promise<Triage> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    system: systemPrompt(),
    tools: [triageTool],
    tool_choice: { type: "tool", name: "submit_triage" },
    messages: [
      {
        role: "user",
        content: [
          `From: ${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}`,
          `Subject: ${email.subject ?? "(no subject)"}`,
          "",
          email.bodyText.slice(0, 6000),
        ].join("\n"),
      },
    ],
  });

  const tu = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_triage",
  );
  const inp = (tu?.input ?? {}) as Record<string, unknown>;
  return {
    summary: String(inp.summary ?? ""),
    category: String(inp.category ?? "other"),
    priority: String(inp.priority ?? "normal"),
    draftReply: String(inp.draftReply ?? ""),
  };
}
