import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore, type CandidateDocument, type CandidateDocumentType } from "@/lib/portal";

const documentTypes: CandidateDocumentType[] = ["RESUME", "AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO", "POLICE_VERIFICATION", "EXPERIENCE_CERTIFICATE", "EDUCATION_CERTIFICATE", "OTHER"];
const documentStatuses: CandidateDocument["status"][] = ["PENDING", "VERIFIED", "REJECTED"];

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/candidates/[candidateId]/documents/[type]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId, type: rawType } = await params;
  const type = rawType as CandidateDocumentType;
  const body = await request.json() as Partial<{ status: CandidateDocument["status"]; rejectionReason: string }>;
  if (!documentTypes.includes(type) || !body.status || !documentStatuses.includes(body.status)) return Response.json({ error: "Invalid document status." }, { status: 400 });
  const rejectionReason = body.rejectionReason?.trim();
  if (body.status === "REJECTED" && !rejectionReason) return Response.json({ error: "Rejection reason is required." }, { status: 400 });
  try {
    const data = await portalStore.updateCandidateDocumentStatus(candidateId, type, body.status, rejectionReason, session.email, getAdminScope(session));
    return Response.json({ data, message: "Document status updated." });
  } catch {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }
}
