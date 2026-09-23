import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore, type Candidate } from "@/lib/portal";
import { purgeCandidateByAdmin, updateCandidateAdminFields } from "@/lib/admin-operations";
import { deleteObject } from "@/lib/storage";

const verificationStatuses: Candidate["verificationStatus"][] = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "BLOCKED"];
const availabilityStatuses = ["AVAILABLE", "INTERVIEWING", "SELECTED", "WORKING", "NOT_AVAILABLE"] as const;

export async function GET(_request: Request, { params }: RouteContext<"/api/admin/candidates/[candidateId]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId } = await params;
  try {
    return Response.json({ data: await portalStore.getAdminCandidateDetails(candidateId, getAdminScope(session)) });
  } catch {
    return Response.json({ error: "Candidate not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/candidates/[candidateId]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId } = await params;
  const body = await request.json() as { verificationStatus?: Candidate["verificationStatus"]; availability?: Candidate["availability"]; blockReason?: string; adminNotes?: string };
  if (!body.verificationStatus || !verificationStatuses.includes(body.verificationStatus) || body.availability && !availabilityStatuses.includes(body.availability as typeof availabilityStatuses[number])) return Response.json({ error: "Candidate operational status is invalid." }, { status: 400 });
  if ((body.adminNotes?.length ?? 0) > 2000 || (body.blockReason?.length ?? 0) > 500) return Response.json({ error: "Admin notes ya block reason bahut lamba hai." }, { status: 400 });
  try { return Response.json({ data: await updateCandidateAdminFields(candidateId, { verificationStatus: body.verificationStatus, availability: body.availability, blockReason: body.blockReason, adminNotes: body.adminNotes }, session.id, getAdminScope(session)) }); } catch (error) { if (error instanceof Error && error.message === "BLOCK_REASON_REQUIRED") return Response.json({ error: "Candidate block karne ke liye reason required hai." }, { status: 400 }); return Response.json({ error: "Candidate not found." }, { status: 404 }); }
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/admin/candidates/[candidateId]">) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId } = await params;
  const body = await request.json() as { confirmation?: string; reason?: string };
  if (body.confirmation !== candidateId || !body.reason?.trim()) return Response.json({ error: "Candidate ID confirmation aur deletion reason required hai." }, { status: 400 });
  const documents = await portalStore.getCandidateDocumentKeysForDeletion(candidateId);
  const cleanup = await Promise.all(documents.map((document) => deleteObject(document.storageKey)));
  if (cleanup.some((removed) => !removed)) return Response.json({ error: "Private files delete nahi hue; account deletion stop kar diya gaya." }, { status: 503 });
  try { return Response.json({ data: await purgeCandidateByAdmin(candidateId, session.id, body.reason.trim()), message: "Candidate account aur personal data delete ho gaya." }); } catch { return Response.json({ error: "Candidate not found." }, { status: 404 }); }
}
