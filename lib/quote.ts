import { extractToolCall, type AiTool } from "./ai";
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

interface ResearchResult {
  kind: QuoteKind;
  summary: string;
  items: RawItem[];
  websiteTier?: string;
  assumptions: string;
}

const submitTool: AiTool = {
  name: "submit_quote",
  description:
    "Submit the quote details. Prices are estimated US retail unit prices in USD. Do NOT include tax, labor, or markup — the shop computes those.",
  parameters: {
    type: "object",
    properties: {
      kind: { type: "string", description: "build (new PC build), repair (parts replacement/repair), or website." },
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
            retailer: { type: "string" },
            note: { type: "string" },
          },
          required: ["name", "qty", "unitPrice"],
        },
      },
      websiteTier: { type: "string", description: "For websites: web_landing, web_small_business, or web_custom." },
      assumptions: { type: "string", description: "Assumptions made (quality tier, what's included, etc.)." },
    },
    required: ["kind", "summary", "items", "assumptions"],
  },
};

function systemPrompt(): string {
  return [
    `You are the estimating assistant for ${business.name} (${business.location}). A customer wants a price estimate. Decide whether it's a new PC build, a repair / parts replacement, or a website, then submit a structured quote using your knowledge of current US retail prices.`,
    "",
    "For a build or repair: list the specific parts with realistic current US retail unit prices. Choose sensible mid-range quality unless the customer specifies a budget; match the budget when given. For a build, include CPU, motherboard, RAM, storage, GPU (if gaming), PSU, case, cooler, and Windows if needed.",
    "For a website: no parts. Recommend the tier that fits (web_landing $300, web_small_business $600, web_custom $1000+).",
    "Do not calculate tax, labor, or totals — the shop adds those. Prices in plain USD numbers. Always call submit_quote.",
  ].join("\n");
}

async function research(request: string): Promise<ResearchResult> {
  const inp = await extractToolCall<Record<string, unknown>>({
    system: systemPrompt(),
    user: `Customer request: ${request}`,
    tool: submitTool,
    maxTokens: 2000,
  });

  const kind = (["build", "repair", "website"].includes(String(inp.kind)) ? inp.kind : "repair") as QuoteKind;
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

export interface QuoteResult {
  id: string;
  kind: QuoteKind;
  summary: string;
  assumptions: string;
  computed: ComputedQuote;
}

/** Generate, price, save, and send a quote. */
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

  const lines = computed.lines
    .map((l) => `  • ${l.qty}× ${l.name} — $${l.lineTotal.toFixed(2)}${l.retailer ? ` (${l.retailer})` : ""}`)
    .join("\n");
  await notifyOwner(
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
