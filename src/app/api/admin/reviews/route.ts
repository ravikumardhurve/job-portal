import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type ServiceReviewStatus } from "@/lib/portal";

const statuses: ServiceReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: Request) {
  if (!await getAdminSession(["SUPER_ADMIN", "ADMIN"])) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const value = new URL(request.url).searchParams.get("status");
  const status = value && statuses.includes(value as ServiceReviewStatus) ? value as ServiceReviewStatus : undefined;
  return Response.json({ data: await portalStore.listAdminServiceReviews(status) });
}
