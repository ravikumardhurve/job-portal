import { portalStore } from "@/lib/portal";
import { isServicePageSlug } from "@/lib/service-pages";

export async function POST(request: Request) {
  const body = await request.json() as { serviceSlug?: string; customerName?: string; city?: string; rating?: number; comment?: string };
  const customerName = body.customerName?.trim() ?? "";
  const city = body.city?.trim();
  const comment = body.comment?.trim() ?? "";
  const rating = Number(body.rating);

  if (!body.serviceSlug || !isServicePageSlug(body.serviceSlug)) return Response.json({ error: "Please select a valid service." }, { status: 400 });
  if (customerName.length < 2 || customerName.length > 80) return Response.json({ error: "Please enter a valid name." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return Response.json({ error: "Please select a rating from 1 to 5." }, { status: 400 });
  if (comment.length < 15 || comment.length > 1000) return Response.json({ error: "Review must be between 15 and 1000 characters." }, { status: 400 });
  if (city && city.length > 80) return Response.json({ error: "City is too long." }, { status: 400 });

  const data = await portalStore.createServiceReview({
    serviceSlug: body.serviceSlug,
    customerName,
    city,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    comment,
  });
  return Response.json({ data: { id: data.id }, message: "Thank you. Your review will appear after verification." }, { status: 201 });
}
