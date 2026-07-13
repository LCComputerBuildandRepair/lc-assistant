"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isLoggedIn } from "@/lib/session";
import { sendReply as smtpSend, mailConfigured } from "@/lib/mail";

async function assertAuth() {
  if (!(await isLoggedIn())) throw new Error("Unauthorized");
}

export async function sendEmailReply(id: string, text: string): Promise<{ error?: string }> {
  await assertAuth();
  if (!mailConfigured()) return { error: "No mailbox connected." };
  if (!text.trim()) return { error: "The reply is empty." };

  const email = await db.email.findUnique({ where: { id } });
  if (!email) return { error: "Email not found." };

  const subject = (email.subject ?? "").toLowerCase().startsWith("re:")
    ? email.subject!
    : `Re: ${email.subject ?? "your message"}`;

  try {
    await smtpSend({
      to: email.fromEmail,
      subject,
      text,
      inReplyTo: email.messageId,
    });
  } catch (err) {
    console.error("Send reply failed:", err);
    return { error: "Couldn't send — check the mailbox connection." };
  }

  await db.email.update({ where: { id }, data: { draftReply: text, status: "replied" } });
  revalidatePath("/inbox");
  return {};
}

export async function setEmailStatus(id: string, status: string) {
  await assertAuth();
  await db.email.update({ where: { id }, data: { status } });
  revalidatePath("/inbox");
}
