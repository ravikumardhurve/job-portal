import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type ServiceReviewStatus } from "@/lib/portal";

const statuses: ServiceReviewStatus[] = ["APPROVED", "REJECTED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { status?: ServiceReviewStatus };
  if (!body.status || !statuses.includes(body.status)) return Response.json({ error: "Invalid review status." }, { status: 400 });
  try {
    const { reviewId } = await params;
    const data = await portalStore.updateServiceReviewStatus(reviewId, body.status, session.id);
    return Response.json({ data, message: "Review status updated." });
  } catch (error) {
    if (error instanceof Error && error.message === "SERVICE_REVIEW_NOT_FOUND") return Response.json({ error: "Review not found." }, { status: 404 });
    throw error;
  }
}
