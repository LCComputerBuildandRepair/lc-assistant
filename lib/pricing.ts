import { business } from "./business";

/**
 * Quote pricing configuration. All money math lives here in code (not the AI) so
 * it's always correct and you control the numbers. Override any value with the
 * matching environment variable without touching code.
 */
export const pricingConfig = {
  /** Ohio sales tax on parts. Mansfield / Richland County ≈ 7.0% (5.75% state + 1.25% county). */
  taxRate: envNum("QUOTE_TAX_RATE", 0.07),
  /** Markup applied to parts so the shop profits. Kept modest by default. */
  partsMarkupRate: envNum("QUOTE_PARTS_MARKUP", 0.1),
  /** Flat labor for a custom PC build (from your Ultimate Care rate). */
  buildLabor: envNum("QUOTE_BUILD_LABOR", 175),
  /** Base labor for a repair / parts replacement (from your Essential Care rate). */
  repairLabor: envNum("QUOTE_REPAIR_LABOR", 50),
};

export type QuoteKind = "build" | "repair" | "website";

/** A raw part as researched (retail unit price). */
export interface RawItem {
  name: string;
  qty: number;
  unitPrice: number; // estimated retail
  retailer?: string;
  note?: string;
}

/** A priced line item shown on the quote (customer pays `unitPrice`). */
export interface QuoteLine {
  name: string;
  qty: number;
  retailUnit: number; // shop's estimated cost basis
  unitPrice: number; // charged to customer (retail + markup)
  lineTotal: number;
  retailer?: string;
  note?: string;
}

export interface ComputedQuote {
  kind: QuoteKind;
  lines: QuoteLine[];
  partsCost: number; // shop's estimated parts cost
  partsMarkupRate: number;
  partsCharge: number; // parts total charged to customer
  taxRate: number;
  tax: number;
  labor: number;
  total: number;
  marginEstimate: number; // your estimated take (parts margin + labor)
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Website labor from your published tiers. */
export function websiteLaborForTier(tier: string): number {
  const svc = business.services.find((s) => s.key === tier);
  // Parse a leading dollar amount from the price string (e.g. "Flat $600" → 600).
  const m = svc?.price.match(/\$([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : 300;
}

/**
 * Compute a fully-priced quote from researched parts. `labor` is the labor charge
 * (build/repair from config, website from the tier); parts get markup + tax.
 */
export function computeQuote(
  kind: QuoteKind,
  rawItems: RawItem[],
  labor: number,
): ComputedQuote {
  const markup = kind === "website" ? 0 : pricingConfig.partsMarkupRate;

  const lines: QuoteLine[] = rawItems.map((r) => {
    const qty = Math.max(1, Math.round(r.qty || 1));
    const retailUnit = round2(Math.max(0, r.unitPrice || 0));
    const unitPrice = round2(retailUnit * (1 + markup));
    return {
      name: r.name,
      qty,
      retailUnit,
      unitPrice,
      lineTotal: round2(unitPrice * qty),
      retailer: r.retailer,
      note: r.note,
    };
  });

  const partsCharge = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const partsCost = round2(lines.reduce((s, l) => s + l.retailUnit * l.qty, 0));
  const tax = kind === "website" ? 0 : round2(partsCharge * pricingConfig.taxRate);
  const total = round2(partsCharge + tax + labor);
  const marginEstimate = round2(partsCharge - partsCost + labor);

  return {
    kind,
    lines,
    partsCost,
    partsMarkupRate: markup,
    partsCharge,
    taxRate: kind === "website" ? 0 : pricingConfig.taxRate,
    tax,
    labor: round2(labor),
    total,
    marginEstimate,
  };
}

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}
