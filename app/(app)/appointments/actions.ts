"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLoggedIn } from "@/lib/session";

async function assertAuth() {
  if (!(await isLoggedIn())) throw new Error("Unauthorized");
}

export async function createAppointment(formData: FormData) {
  await assertAuth();

  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  if (!scheduledAt) throw new Error("A date and time is required.");

  await db.appointment.create({
    data: {
      customerName: String(formData.get("customerName") ?? "").trim() || "Unnamed",
      customerPhone: str(formData.get("customerPhone")),
      customerEmail: str(formData.get("customerEmail")),
      serviceType: String(formData.get("serviceType") ?? "diagnostic"),
      type: String(formData.get("type") ?? "in_store"),
      scheduledAt: new Date(scheduledAt),
      durationMin: Number(formData.get("durationMin") ?? 60) || 60,
      location: str(formData.get("location")),
      notes: str(formData.get("notes")),
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  redirect("/appointments");
}

export async function setAppointmentStatus(id: string, status: string) {
  await assertAuth();
  await db.appointment.update({ where: { id }, data: { status } });
  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
