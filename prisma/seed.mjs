import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function at(dayOffset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const seed = [
  {
    customerName: "Sarah Mitchell",
    customerPhone: "(419) 214-8890",
    serviceType: "essential_care",
    type: "dropoff",
    status: "confirmed",
    scheduledAt: at(0, 10),
    notes: "Laptop running very slow — wants a tune-up. Overheating too.",
  },
  {
    customerName: "Dave Okafor",
    customerPhone: "(419) 771-0043",
    serviceType: "custom_build",
    type: "dropoff",
    status: "scheduled",
    scheduledAt: at(0, 14),
    notes: "Wants a mid-range gaming PC, ~$1200 budget.",
  },
  {
    customerName: "Priya Nair",
    customerPhone: "(419) 663-2211",
    serviceType: "performance_care",
    type: "dropoff",
    status: "in_progress",
    scheduledAt: at(-1, 11),
    notes: "Pop-ups and slow performance — virus removal + SSD upgrade.",
  },
  {
    customerName: "Tom Reyes",
    serviceType: "home_pro",
    type: "home_call",
    status: "scheduled",
    scheduledAt: at(2, 13),
    location: "48 Cedar Lane, Mansfield, OH",
    notes: "New PC setup + printer/network config at home.",
  },
  {
    customerName: "Mansfield Coffee Co.",
    customerPhone: "(419) 908-3320",
    serviceType: "pos_setup",
    type: "in_store",
    status: "scheduled",
    scheduledAt: at(3, 9),
    notes: "New POS terminal install for the front counter.",
  },
  {
    customerName: "Grace Liu",
    customerPhone: "(419) 555-2277",
    serviceType: "web_small_business",
    type: "remote",
    status: "completed",
    scheduledAt: at(-3, 15),
    notes: "Small business site delivered — 4 pages.",
  },
];

await db.appointment.deleteMany({});
for (const a of seed) {
  await db.appointment.create({ data: a });
}

console.log(`Seeded ${seed.length} appointments.`);
await db.$disconnect();
