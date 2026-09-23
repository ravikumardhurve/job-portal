import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type CandidatePrivacyRequestStatus } from "@/lib/portal";
import { deleteObject } from "@/lib/storage";

const statuses: Array<Exclude<CandidatePrivacyRequestStatus, "SUBMITTED" | "CANCELLED">> = ["IN_REVIEW", "COMPLETED", "REJECTED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { requestId } = await params;
  const body = await request.json() as { status?: Exclude<CandidatePrivacyRequestStatus, "SUBMITTED" | "CANCELLED">; resolutionNote?: string };
  if (!body.status || !statuses.includes(body.status)) return Response.json({ error: "Invalid privacy request status." }, { status: 400 });
  if (body.status === "REJECTED" && !body.resolutionNote?.trim()) return Response.json({ error: "A rejection reason is required." }, { status: 400 });
  if ((body.resolutionNote?.length ?? 0) > 500) return Response.json({ error: "Resolution note must be 500 characters or less." }, { status: 400 });
  try {
    const privacyRequest = await portalStore.getCandidatePrivacyRequestForAdmin(requestId);
    if (body.status === "COMPLETED") {
      const documents = await portalStore.getCandidateDocumentKeysForDeletion(privacyRequest.candidateId);
      const cleanup = await Promise.all(documents.map((document) => deleteObject(document.storageKey)));
      if (cleanup.some((deleted) => !deleted)) return Response.json({ error: "Private files could not be removed from storage. Request was not completed." }, { status: 503 });
    }
    const data = await portalStore.updateCandidatePrivacyRequest(requestId, body.status, session.id, body.resolutionNote?.trim());
    return Response.json({ data, message: body.status === "COMPLETED" ? "Candidate data securely deleted." : "Privacy request updated." });
  } catch (error) {
    if (error instanceof Error && error.message === "PRIVACY_REQUEST_NOT_FOUND") return Response.json({ error: "Privacy request not found." }, { status: 404 });
    throw error;
  }
}
