/**
 * ============================================================================
 *  OWNER-EDITABLE PARTS PRICE LIST  —  EDIT THE NUMBERS BELOW ANYTIME
 * ============================================================================
 *
 * WHY THIS EXISTS: the AI estimates part prices from its training data, which is
 * old. Memory (RAM) and storage (SSD/HDD) prices have spiked hard, so the AI
 * lowballs them badly (it still thinks 16GB of RAM is ~$50). To keep quotes
 * accurate, RAM and storage are priced from THIS table — your numbers — instead
 * of the AI. The AI still estimates the stable stuff (cases, fans, cables, etc.).
 *
 * HOW TO UPDATE: change the dollar amounts below to today's real prices whenever
 * the market moves, then save + push (Netlify redeploys automatically). These
 * are your estimated RETAIL cost per item, BEFORE your markup and tax — the app
 * adds those on top.
 *
 *   RAM is priced per KIT (a "32GB" entry = the price of a full 32GB kit).
 *   Storage is priced per DRIVE by its size.
 *
 * If a size isn't listed, the closest listed size is used. If a part isn't
 * recognized here at all, the AI's estimate is used as a fallback.
 * ----------------------------------------------------------------------------
 */

/** DDR5 RAM — price per full kit (USD, retail). Update to current prices. */
const RAM_DDR5: Record<number, number> = {
  8: 90,
  16: 150,
  32: 300,
  48: 450,
  64: 600,
  96: 900,
  128: 1200,
};

/** DDR4 RAM — price per full kit (USD, retail). Update to current prices. */
const RAM_DDR4: Record<number, number> = {
  8: 55,
  16: 100,
  32: 200,
  64: 400,
};

/** NVMe / M.2 SSD — price per drive by capacity in GB (USD, retail). */
const SSD_NVME: Record<number, number> = {
  250: 45,
  500: 75,
  1000: 130,
  2000: 240,
  4000: 470,
  8000: 900,
};

/** SATA (2.5") SSD — price per drive by capacity in GB (USD, retail). */
const SSD_SATA: Record<number, number> = {
  250: 40,
  500: 65,
  1000: 115,
  2000: 220,
  4000: 430,
};

/** Spinning hard drive (HDD) — price per drive by capacity in GB (USD, retail). */
const HDD: Record<number, number> = {
  1000: 55,
  2000: 70,
  4000: 110,
  8000: 185,
  12000: 270,
  16000: 340,
};

// ============================================================================
//  Matching logic — you normally don't need to touch anything below here.
// ============================================================================

export interface CatalogHit {
  price: number; // retail unit price from the table above
  label: string; // clean label, e.g. "32GB DDR5 RAM"
}

/** Pull the capacity out of a part name and return it in GB. */
function capacityGB(name: string): number | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(tb|gb)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (isNaN(v) || v <= 0) return null;
  return m[2].toLowerCase() === "tb" ? Math.round(v * 1000) : Math.round(v);
}

/** Look up a price by size — exact match, else nearest size within 30%. */
function lookup(table: Record<number, number>, gb: number): number | null {
  if (table[gb] != null) return table[gb];
  let best: number | null = null;
  let bestKey = 0;
  for (const key of Object.keys(table).map(Number)) {
    const withinTolerance = Math.abs(key - gb) / gb <= 0.3;
    if (withinTolerance && (best === null || Math.abs(key - gb) < Math.abs(bestKey - gb))) {
      best = table[key];
      bestKey = key;
    }
  }
  return best;
}

function capacityLabel(gb: number): string {
  return gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000}TB` : `${gb}GB`;
}

/**
 * If a part name is a RAM or storage item we price ourselves, return the current
 * price from the table above. Otherwise null (the AI's estimate is used).
 */
export function catalogPrice(name: string): CatalogHit | null {
  const n = name.toLowerCase();
  const gb = capacityGB(n);
  if (gb == null) return null;

  const isRam = /(\bram\b|\bddr\d\b|\bdimm\b|\bsodimm\b|\bmemory\b)/.test(n);
  const isHdd = /(\bhdd\b|hard\s*drive|7200\s*rpm|5400\s*rpm)/.test(n);
  const isNvme = /(\bnvme\b|\bm\.?2\b|\bpcie\b|gen\s*[345])/.test(n);
  const isSsd = /\bssd\b/.test(n);

  if (isRam) {
    const isDdr4 = /ddr4/.test(n);
    const isDdr3 = /ddr3/.test(n);
    // Default to DDR5 for modern builds unless DDR4/DDR3 is stated.
    const table = isDdr4 || isDdr3 ? RAM_DDR4 : RAM_DDR5;
    const price = lookup(table, gb);
    if (price != null) {
      return { price, label: `${capacityLabel(gb)} ${isDdr4 || isDdr3 ? "DDR4" : "DDR5"} RAM` };
    }
  }

  if (isHdd) {
    const price = lookup(HDD, gb);
    if (price != null) return { price, label: `${capacityLabel(gb)} HDD` };
  }

  if (isNvme || isSsd) {
    const table = isNvme ? SSD_NVME : SSD_SATA;
    const price = lookup(table, gb);
    if (price != null) {
      return { price, label: `${capacityLabel(gb)} ${isNvme ? "NVMe SSD" : "SSD"}` };
    }
  }

  return null;
}

export interface CatalogItem {
  name: string;
  qty: number;
  unitPrice: number;
  retailer?: string;
  note?: string;
}

/**
 * Re-price a list of researched parts: any RAM/storage item we recognize gets
 * its price replaced with the current price from the table above (so the AI's
 * stale number never reaches the customer). Everything else is left as-is.
 */
export function applyCatalogPricing<T extends CatalogItem>(items: T[]): T[] {
  return items.map((it) => {
    const hit = catalogPrice(it.name);
    if (!hit) return it;
    return {
      ...it,
      unitPrice: hit.price,
      note: it.note ? `${it.note} · current shop price` : "Priced at current shop rate",
    };
  });
}
