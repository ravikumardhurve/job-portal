import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { updateEmployerRequirement } from "@/lib/admin-operations";
import type { LeadStatus } from "@/lib/portal";
import { EMPLOYER_REQUIREMENT_STATUSES } from "@/lib/statuses";

export async function PATCH(request: Request, { params }: { params: Promise<{ requirementId: string }> }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { requirementId } = await params;
  const body = await request.json() as { status?: LeadStatus; assignedTo?: string; internalNotes?: string; nextFollowUpAt?: string };
  if (!body.status || !EMPLOYER_REQUIREMENT_STATUSES.includes(body.status)) return Response.json({ error: "Invalid requirement status." }, { status: 400 });
  if ((body.internalNotes?.length ?? 0) > 2000 || (body.assignedTo?.length ?? 0) > 120) return Response.json({ error: "Notes ya assignment bahut lamba hai." }, { status: 400 });
  try {
    const data = await updateEmployerRequirement(requirementId, { status: body.status, assignedTo: body.assignedTo, internalNotes: body.internalNotes, nextFollowUpAt: body.nextFollowUpAt }, session.id, getAdminScope(session));
    return Response.json({ data, message: "Requirement workflow updated." });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPLOYER_REQUIREMENT_NOT_FOUND") return Response.json({ error: "Employer requirement not found." }, { status: 404 });
    throw error;
  }
}
