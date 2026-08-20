import { portalStore, type NotificationMessage, type WebsitePost } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as { type?: "announcement" | "post" | "notification"; title?: string; link?: string; excerpt?: string; category?: WebsitePost["category"]; message?: string; audience?: NotificationMessage["audience"]; channel?: NotificationMessage["channel"] };
  if (!body.type || !body.title) return Response.json({ error: "Content type and title are required." }, { status: 400 });
  if (body.type === "announcement") return Response.json({ data: portalStore.createAnnouncement({ title: body.title, link: body.link }) }, { status: 201 });
  if (body.type === "post") {
    if (!body.excerpt || !body.category) return Response.json({ error: "Post excerpt and category are required." }, { status: 400 });
    return Response.json({ data: portalStore.createWebsitePost({ title: body.title, excerpt: body.excerpt, category: body.category }) }, { status: 201 });
  }
  if (!body.message || !body.audience || !body.channel) return Response.json({ error: "Notification message, audience and channel are required." }, { status: 400 });
  return Response.json({ data: portalStore.createNotification({ title: body.title, message: body.message, audience: body.audience, channel: body.channel }) }, { status: 201 });
}