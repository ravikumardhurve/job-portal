import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { updateServiceRequest } from "@/lib/admin-operations";
import type { ServiceRequest } from "@/lib/portal";
import { SERVICE_REQUEST_STATUSES } from "@/lib/statuses";

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { requestId } = await params;
  const body = await request.json() as Partial<Pick<ServiceRequest, "status" | "assignedStaff" | "assignedVendor" | "scheduledAt" | "internalNotes">>;
  if (body.status && !SERVICE_REQUEST_STATUSES.includes(body.status)) return Response.json({ error: "Invalid service request status." }, { status: 400 });
  if (!body.status && body.assignedStaff === undefined && body.assignedVendor === undefined && body.scheduledAt === undefined && body.internalNotes === undefined) return Response.json({ error: "Update fields required hain." }, { status: 400 });
  if ((body.internalNotes?.length ?? 0) > 2000) return Response.json({ error: "Internal notes maximum 2000 characters ho sakte hain." }, { status: 400 });
  try {
    const data = await updateServiceRequest(requestId, body, session.id, getAdminScope(session));
    return Response.json({ data, message: "Service request details updated." });
  } catch (error) {
    if (error instanceof Error && error.message === "SERVICE_REQUEST_NOT_FOUND") return Response.json({ error: "Service request not found." }, { status: 404 });
    throw error;
  }
}
