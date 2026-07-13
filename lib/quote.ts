import Anthropic from "@anthropic-ai/sdk";
import { getClient } from "./claude";
import { db } from "./db";
import { notifyOwner } from "./notify";
import { business } from "./business";
import {
  computeQuote,
  websiteLaborForTier,
  pricingConfig,
  type ComputedQuote,
  type QuoteKind,
  type RawItem,
} from "./pricing";

const MODEL = "claude-opus-4-8";

interface ResearchResult {
  kind: QuoteKind;
  summary: string;
  items: RawItem[];
  websiteTier?: string;
  assumptions: string;
}

const submitTool: Anthropic.Tool = {
  name: "submit_quote",
  description:
    "Submit the researched quote details. Prices are estimated US retail unit prices in USD. Do NOT include tax, labor, or markup — the shop computes those.",
  input_schema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        description: "build (new PC build), repair (parts replacement/repair), or website.",
      },
      summary: { type: "string", description: "One-line description of what's being quoted." },
      items: {
        type: "array",
        description: "Parts needed. Empty for a website.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            qty: { type: "number" },
            unitPrice: { type: "number", description: "Estimated retail unit price, USD." },
            retailer: { type: "string", description: "Where the price is from (Best Buy, Micro Center, etc.)." },
            note: { type: "string" },
          },
          required: ["name", "qty", "unitPrice"],
        },
      },
      websiteTier: {
        type: "string",
        description: "For websites: web_landing, web_small_business, or web_custom.",
      },
      assumptions: { type: "string", description: "Assumptions made (quality tier, what's included, etc.)." },
    },
    required: ["kind", "summary", "items", "assumptions"],
  },
};

function systemPrompt(): string {
  return [
    `You are the estimating assistant for ${business.name} (${business.location}). A customer wants a price estimate. Figure out whether it's a new PC build, a repair / parts replacement, or a website, then research current prices and submit a structured quote.`,
    "",
    "For a build or repair:",
    "- List the specific parts required with realistic CURRENT US retail unit prices. If web search is available, look up current prices at major retailers (Best Buy, Micro Center, Amazon, Newegg). Otherwise use your best current estimate.",
    "- Choose sensible mid-range quality parts unless the customer specifies a budget or preference; match the budget when given.",
    "- For a build, include all needed components (CPU, motherboard, RAM, storage, GPU if gaming, PSU, case, cooler, and Windows if needed).",
    "",
    "For a website: no parts. Recommend the tier that fits (web_landing $300, web_small_business $600, web_custom $1000+).",
    "",
    "Then call submit_quote with the details. Do not calculate tax, labor, or totals — the shop adds those. Keep prices in plain USD numbers.",
  ].join("\n");
}

/** Ask the model to research and structure the quote items. */
async function research(request: string): Promise<ResearchResult> {
  const client = getClient();
  const useWebSearch = (process.env.QUOTE_WEB_SEARCH || "on").toLowerCase() !== "off";

  const tools: Anthropic.ToolUnion[] = [submitTool];
  if (useWebSearch) {
    tools.unshift({ type: "web_search_20260209", name: "web_search", max_uses: 5 } as Anthropic.ToolUnion);
  }

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Customer request: ${request}\n\nResearch and submit a quote.` },
  ];

  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: systemPrompt(),
      tools,
      messages,
    });

    const submit = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_quote",
    );
    if (submit) {
      const inp = submit.input as Record<string, unknown>;
      const kind = (["build", "repair", "website"].includes(String(inp.kind))
        ? inp.kind
        : "repair") as QuoteKind;
      const items: RawItem[] = Array.isArray(inp.items)
        ? (inp.items as Record<string, unknown>[]).map((it) => ({
            name: String(it.name ?? "Part"),
            qty: Number(it.qty ?? 1),
            unitPrice: Number(it.unitPrice ?? 0),
            retailer: it.retailer ? String(it.retailer) : undefined,
            note: it.note ? String(it.note) : undefined,
          }))
        : [];
      return {
        kind,
        summary: String(inp.summary ?? request),
        items,
        websiteTier: inp.websiteTier ? String(inp.websiteTier) : undefined,
        assumptions: String(inp.assumptions ?? ""),
      };
    }

    if (response.stop_reason === "pause_turn" || response.stop_reason === "tool_use") {
      // Server tool (web search) ran or is mid-loop — append and continue.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    // Model ended without submitting — nudge once, then give up.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: "Please call submit_quote now with your best estimate." });
  }

  throw new Error("Could not produce a quote.");
}

export interface QuoteResult {
  id: string;
  kind: QuoteKind;
  summary: string;
  assumptions: string;
  computed: ComputedQuote;
}

/** Generate, price, save, and send a quote. Returns the full result (owner-side). */
export async function generateQuote(
  request: string,
  customer?: { name?: string; phone?: string; email?: string },
): Promise<QuoteResult> {
  const r = await research(request);

  const labor =
    r.kind === "website"
      ? websiteLaborForTier(r.websiteTier || "web_landing")
      : r.kind === "build"
        ? pricingConfig.buildLabor
        : pricingConfig.repairLabor;

  const computed = computeQuote(r.kind, r.kind === "website" ? [] : r.items, labor);

  const saved = await db.quote.create({
    data: {
      kind: r.kind,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
      customerEmail: customer?.email ?? null,
      request,
      summary: r.summary,
      itemsJson: JSON.stringify(computed.lines),
      partsCost: computed.partsCost,
      partsMarkupRate: computed.partsMarkupRate,
      partsCharge: computed.partsCharge,
      taxRate: computed.taxRate,
      tax: computed.tax,
      labor: computed.labor,
      total: computed.total,
      marginEstimate: computed.marginEstimate,
      assumptions: r.assumptions,
    },
  });

  // Send the quote to the owner with the profit breakdown.
  const lines = computed.lines
    .map((l) => `  • ${l.qty}× ${l.name} — $${l.lineTotal.toFixed(2)}${l.retailer ? ` (${l.retailer})` : ""}`)
    .join("\n");
  notifyOwner(
    `New quote: ${r.summary}`,
    [
      customer?.name ? `Customer: ${customer.name}` : "Customer: (not provided)",
      customer?.phone ? `Phone: ${customer.phone}` : null,
      customer?.email ? `Email: ${customer.email}` : null,
      "",
      `Request: ${request}`,
      lines ? `\nParts:\n${lines}` : "",
      "",
      `Parts (charged): $${computed.partsCharge.toFixed(2)}`,
      computed.tax ? `Tax: $${computed.tax.toFixed(2)}` : null,
      `Labor: $${computed.labor.toFixed(2)}`,
      `TOTAL: $${computed.total.toFixed(2)}`,
      "",
      `Your est. parts cost: $${computed.partsCost.toFixed(2)}`,
      `Your est. take (margin + labor): $${computed.marginEstimate.toFixed(2)}`,
      r.assumptions ? `\nAssumptions: ${r.assumptions}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  ).catch(() => {});

  return { id: saved.id, kind: r.kind, summary: r.summary, assumptions: r.assumptions, computed };
}
