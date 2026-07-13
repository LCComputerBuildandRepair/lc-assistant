"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isLoggedIn } from "@/lib/session";

export async function setMessageStatus(id: string, status: string) {
  if (!(await isLoggedIn())) throw new Error("Unauthorized");
  await db.contactMessage.update({ where: { id }, data: { status } });
  revalidatePath("/messages");
  revalidatePath("/dashboard");
}
