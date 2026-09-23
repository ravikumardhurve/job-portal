import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { updateInterview } from "@/lib/admin-operations";
import type { Interview } from "@/lib/portal";

const statuses: Interview["status"][] = ["SCHEDULED", "RESCHEDULED", "COMPLETED", "SELECTED", "REJECTED", "NO_SHOW", "CANCELLED"];

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/interviews/[interviewId]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { interviewId } = await params;
  const body = await request.json() as Partial<Pick<Interview, "status" | "scheduledAt" | "mode" | "address" | "meetingLink" | "contactPerson" | "contactMobile" | "instructions" | "internalNotes" | "cancelReason">>;
  if (body.status && !statuses.includes(body.status)) return Response.json({ error: "Invalid interview status." }, { status: 400 });
  if (body.status === "CANCELLED" && !body.cancelReason?.trim()) return Response.json({ error: "Cancellation reason required hai." }, { status: 400 });
  if (body.scheduledAt && Number.isNaN(new Date(body.scheduledAt).valueOf())) return Response.json({ error: "Valid interview date/time required hai." }, { status: 400 });
  try {
    return Response.json({ data: await updateInterview(interviewId, body, session.id, getAdminScope(session)), message: body.scheduledAt ? "Interview details updated/rescheduled." : "Interview status updated." });
  } catch {
    return Response.json({ error: "Interview not found." }, { status: 404 });
  }
}
