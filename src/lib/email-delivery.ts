import { getDatabase } from "@/lib/mongodb";
import type { Candidate, EmployerRequirement, NotificationMessage } from "@/lib/portal";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export async function deliverEmailNotification(notification: NotificationMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const db = await getDatabase();
  const [candidateEmails, employerEmails] = await Promise.all([
    notification.audience === "EMPLOYERS" ? Promise.resolve([]) : db.collection<Candidate>("candidates").distinct("email", { email: { $type: "string", $ne: "" }, deletedAt: { $exists: false } }),
    notification.audience === "CANDIDATES" ? Promise.resolve([]) : db.collection<EmployerRequirement>("employerRequirements").distinct("contactEmail", { contactEmail: { $type: "string", $ne: "" } }),
  ]);
  const recipients = [...new Set([...candidateEmails, ...employerEmails].map((email) => String(email).trim().toLowerCase()).filter(Boolean))].slice(0, 1000);
  if (!recipients.length) throw new Error("NO_EMAIL_RECIPIENTS");
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#25372e"><h2>${escapeHtml(notification.title)}</h2><p style="line-height:1.7">${escapeHtml(notification.message).replaceAll("\n", "<br>")}</p><p style="margin-top:28px;color:#71837a;font-size:12px">CG Job Care</p></div>`;
  let sent = 0;
  for (let index = 0; index < recipients.length; index += 100) {
    const batch = recipients.slice(index, index + 100).map((to) => ({ from, to: [to], subject: notification.title, html }));
    const response = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${notification.id}-${index / 100}` }, body: JSON.stringify(batch) });
    if (!response.ok) throw new Error(`EMAIL_PROVIDER_ERROR:${response.status}`);
    sent += batch.length;
  }
  return sent;
}

export async function updateNotificationDelivery(notificationId: string, status: "SENT" | "FAILED", recipientCount: number, deliveryError?: string) {
  await (await getDatabase()).collection<NotificationMessage>("notifications").updateOne(
    { id: notificationId },
    { $set: { deliveryStatus: status, recipientCount, ...(status === "SENT" ? { deliveredAt: new Date().toISOString() } : {}), ...(deliveryError ? { deliveryError } : {}) } },
  );
}
