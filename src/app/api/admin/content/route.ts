import { getAdminSession } from "@/lib/admin-auth";
import { recordAudit } from "@/lib/admin-operations";
import { deliverEmailNotification, updateNotificationDelivery } from "@/lib/email-delivery";
import { portalStore, type NotificationMessage, type WebsitePost } from "@/lib/portal";

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { type?: "announcement" | "post" | "notification"; title?: string; link?: string; excerpt?: string; category?: WebsitePost["category"]; message?: string; audience?: NotificationMessage["audience"]; channel?: NotificationMessage["channel"] };
  if (!body.type || !body.title) return Response.json({ error: "Content type and title are required." }, { status: 400 });
  if (body.type === "announcement") return Response.json({ data: await portalStore.createAnnouncement({ title: body.title, link: body.link }) }, { status: 201 });
  if (body.type === "post") {
    if (!body.excerpt || !body.category) return Response.json({ error: "Post excerpt and category are required." }, { status: 400 });
    return Response.json({ data: await portalStore.createWebsitePost({ title: body.title, excerpt: body.excerpt, category: body.category }) }, { status: 201 });
  }
  if (!body.message || !body.audience || !body.channel) return Response.json({ error: "Notification message, audience and channel are required." }, { status: 400 });
  if (body.channel === "SMS" || body.channel === "WHATSAPP") return Response.json({ error: `${body.channel} provider abhi configure nahi hai. Website ya Email channel use karein.` }, { status: 503 });
  const notification = await portalStore.createNotification({ title: body.title, message: body.message, audience: body.audience, channel: body.channel, deliveryStatus: body.channel === "EMAIL" ? "PENDING" : "SENT", recipientCount: 0 });
  if (body.channel === "EMAIL") {
    try {
      const recipientCount = await deliverEmailNotification(notification);
      await updateNotificationDelivery(notification.id, "SENT", recipientCount);
      await recordAudit(session.id, "EMAIL_NOTIFICATION_SENT", "NOTIFICATION", notification.id, { audience: notification.audience, recipientCount });
      return Response.json({ data: { ...notification, deliveryStatus: "SENT", recipientCount }, message: `Email ${recipientCount} recipients ko send hua.` }, { status: 201 });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "EMAIL_DELIVERY_FAILED";
      await updateNotificationDelivery(notification.id, "FAILED", 0, reason);
      const message = reason === "EMAIL_PROVIDER_NOT_CONFIGURED" ? "Email delivery ke liye RESEND_API_KEY aur EMAIL_FROM configure karein." : reason === "NO_EMAIL_RECIPIENTS" ? "Selected audience mein email recipients nahi mile." : "Email provider ne delivery reject kar di.";
      return Response.json({ error: message, data: { ...notification, deliveryStatus: "FAILED" } }, { status: 503 });
    }
  }
  await recordAudit(session.id, "WEBSITE_NOTIFICATION_CREATED", "NOTIFICATION", notification.id, { audience: notification.audience });
  return Response.json({ data: notification, message: "Website notification publish ho gaya." }, { status: 201 });
}
