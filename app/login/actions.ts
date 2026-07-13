"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.OWNER_PASSWORD;

  if (!expected) {
    return { error: "OWNER_PASSWORD is not set on the server." };
  }
  if (password !== expected) {
    return { error: "Incorrect password." };
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();
  redirect("/dashboard");
}
