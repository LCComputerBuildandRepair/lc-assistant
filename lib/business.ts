/**
 * Business knowledge base for LC Computer Build & Repair.
 *
 * This is the single source of truth the AI assistant uses to answer questions
 * and book appointments. Pulled from https://lccomputerbuildandrepair.com.
 * Keep it in sync with the website when services or pricing change.
 */

export const business = {
  name: "LC Computer Build & Repair",
  tagline:
    "Fast turnaround, honest pricing, and work you can trust — from everyday repairs to full custom gaming rigs and professional websites.",
  owner: "Luke",
  location: "Mansfield, Ohio",
  serviceArea:
    "Mansfield, Ohio and the surrounding area. Remote website design available anywhere.",
  email: "lukepennywitt@yahoo.com",
  phone: "", // not published on the website
  social: "@lccomputerbuildandrepair",
  website: "https://lccomputerbuildandrepair.com",
  bookingUrl: "https://calendly.com/lukepennywitt/30min",

  turnaround: "Most repairs are completed in 1–2 hours, same day.",
  hoursNote: "By appointment — customers book online (Calendly).",

  /** The drop-off repair process advertised on the site. */
  process: [
    "Book online — choose a tier and schedule an appointment.",
    "Drop off — bring the computer to us in Mansfield; we confirm the plan.",
    "We fix it — most jobs done within 1–2 hours, same day.",
    "Pick it up — pay only what was agreed upfront.",
  ],

  /**
   * Services offered, grouped by category. `key` is used for Appointment.serviceType.
   * `price` is a human-readable summary; `includes` lists what the tier covers.
   */
  services: [
    // --- Computer Repair (in-shop, drop-off) ---
    {
      key: "essential_care",
      category: "Computer Repair",
      name: "Essential Care",
      price: "$50 — first hour, $30/hr after",
      includes: [
        "Full diagnostics & system check",
        "Internal dust removal & fan cleaning",
        "OS updates & optimization",
        "Minor software & driver fixes",
        "Basic data transfer or cleanup",
      ],
      typicalDurationMin: 90,
    },
    {
      key: "performance_care",
      category: "Computer Repair",
      name: "Performance Care",
      price: "$110 — first 2 hours, $40/hr after",
      includes: [
        "Full diagnostics & performance testing",
        "Hardware install (RAM, SSD, GPU, PSU)",
        "Virus, malware & spyware removal",
        "OS reinstall or repair",
        "Advanced cleanup & system tuning",
        "Basic data backup or migration",
      ],
      typicalDurationMin: 120,
    },
    {
      key: "ultimate_care",
      category: "Computer Repair",
      name: "Ultimate Care",
      price: "$175 — first 3 hours, $45/hr after",
      includes: [
        "Custom PC build or complete rebuild",
        "Advanced diagnostics & component repair",
        "BIOS config & performance optimization",
        "Benchmarking & stability testing",
        "Deep data recovery & migration",
        "Cable management & airflow optimization",
      ],
      typicalDurationMin: 180,
    },
    {
      key: "custom_build",
      category: "Custom Build",
      name: "Custom Gaming PC Build",
      price: "Quote-based (parts + build)",
      includes: [
        "Spec'd to your needs and budget",
        "Assembly, cable management, and airflow",
        "BIOS config, benchmarking & stability testing",
        "Often built same day",
      ],
      typicalDurationMin: 120,
    },

    // --- Home Calls (we come to you) ---
    {
      key: "home_essential",
      category: "Home Calls",
      name: "Home Essential",
      price: "$75 + $55/hr",
      includes: ["On-site help for everyday issues, setup, and cleanup."],
      typicalDurationMin: 60,
    },
    {
      key: "home_performance",
      category: "Home Calls",
      name: "Home Performance",
      price: "$75 + $65/hr",
      includes: ["On-site hardware installs, upgrades, and tuning."],
      typicalDurationMin: 90,
    },
    {
      key: "home_pro",
      category: "Home Calls",
      name: "Home Pro Setup",
      price: "$75 + $70/hr",
      includes: ["Full on-site setup and advanced configuration."],
      typicalDurationMin: 120,
    },

    // --- Commercial & POS ---
    {
      key: "pos_diagnostics",
      category: "Commercial & POS",
      name: "POS Diagnostics",
      price: "$85/hr",
      includes: ["Diagnose point-of-sale system issues."],
      typicalDurationMin: 60,
    },
    {
      key: "pos_setup",
      category: "Commercial & POS",
      name: "POS Setup & Install",
      price: "$125/hr",
      includes: ["Install and configure POS hardware and software."],
      typicalDurationMin: 120,
    },
    {
      key: "pos_migration",
      category: "Commercial & POS",
      name: "POS Migration",
      price: "Quote-based",
      includes: ["Migrate to a new POS system."],
      typicalDurationMin: 120,
    },
    {
      key: "commercial_it",
      category: "Commercial & POS",
      name: "Commercial IT",
      price: "From $85/hr",
      includes: ["General IT support for businesses."],
      typicalDurationMin: 60,
    },

    // --- Website Design (remote) ---
    {
      key: "web_landing",
      category: "Website Design",
      name: "Landing Page",
      price: "Flat $300",
      includes: ["A single, polished landing page."],
      typicalDurationMin: 60,
    },
    {
      key: "web_small_business",
      category: "Website Design",
      name: "Small Business Site",
      price: "Flat $600",
      includes: ["A multi-page small business website."],
      typicalDurationMin: 60,
    },
    {
      key: "web_custom",
      category: "Website Design",
      name: "Custom Build",
      price: "From $1,000",
      includes: ["A fully custom website built to spec."],
      typicalDurationMin: 60,
    },

    { key: "other", category: "Other", name: "Other / Not sure", price: "", includes: [], typicalDurationMin: 60 },
  ],

  /** Ways an appointment can happen. `key` matches Appointment.type. */
  appointmentTypes: [
    { key: "dropoff", name: "Drop-off", description: "Customer brings the device to the shop in Mansfield." },
    { key: "pickup", name: "Pickup", description: "Customer picks up a finished job." },
    { key: "in_store", name: "In-store", description: "Customer visits the shop." },
    { key: "home_call", name: "Home call", description: "We go to the customer's location." },
    { key: "remote", name: "Remote / online", description: "Handled remotely — website design and some support." },
    { key: "phone", name: "Phone consult", description: "We talk it through over the phone." },
  ],
} as const;

export type ServiceKey = (typeof business.services)[number]["key"];
export type AppointmentTypeKey = (typeof business.appointmentTypes)[number]["key"];

export function serviceName(key: string): string {
  return business.services.find((s) => s.key === key)?.name ?? key;
}

export function appointmentTypeName(key: string): string {
  return business.appointmentTypes.find((t) => t.key === key)?.name ?? key;
}

/** A compact, human-readable summary of the business for the AI system prompt. */
export function businessSummary(): string {
  const byCategory = new Map<string, string[]>();
  for (const s of business.services) {
    const line = `    - ${s.name}${s.price ? ` — ${s.price}` : ""}${
      s.includes.length ? `. Includes: ${s.includes.join("; ")}` : ""
    }`;
    const arr = byCategory.get(s.category) ?? [];
    arr.push(line);
    byCategory.set(s.category, arr);
  }
  const serviceBlock = [...byCategory.entries()]
    .map(([cat, lines]) => `  ${cat}:\n${lines.join("\n")}`)
    .join("\n");

  const typeLines = business.appointmentTypes
    .map((t) => `  - ${t.name}: ${t.description}`)
    .join("\n");

  return [
    `Business: ${business.name} — ${business.location}`,
    business.tagline,
    "",
    `Owner: ${business.owner}`,
    `Service area: ${business.serviceArea}`,
    `Turnaround: ${business.turnaround}`,
    `Hours: ${business.hoursNote}`,
    business.email ? `Email: ${business.email}` : null,
    business.social ? `Social: ${business.social}` : null,
    `Website: ${business.website}`,
    `Public online booking: ${business.bookingUrl}`,
    "",
    "How the repair process works:",
    ...business.process.map((p, i) => `  ${i + 1}. ${p}`),
    "",
    "Services & pricing:",
    serviceBlock,
    "",
    "Appointment types:",
    typeLines,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
