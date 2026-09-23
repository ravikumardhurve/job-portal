import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore, type CandidateDocumentType } from "@/lib/portal";
import { deleteObject } from "@/lib/storage";
import { DOCUMENT_CONSENT_VERSION } from "@/lib/privacy";

const documentTypes: CandidateDocumentType[] = ["RESUME", "AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO", "POLICE_VERIFICATION", "EXPERIENCE_CERTIFICATE", "EDUCATION_CERTIFICATE", "OTHER"];

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [documents, candidate] = await Promise.all([portalStore.listCandidateDocuments(session.candidateId), portalStore.getCandidateById(session.candidateId)]);
  return Response.json({ data: documents.map((document) => ({ type: document.type, status: document.status, createdAt: document.createdAt, updatedAt: document.updatedAt, rejectionReason: document.rejectionReason, retentionReviewAt: document.retentionReviewAt })), consent: { accepted: candidate?.consents?.documentProcessingVersion === DOCUMENT_CONSENT_VERSION, acceptedAt: candidate?.consents?.documentProcessingAcceptedAt, version: candidate?.consents?.documentProcessingVersion } });
}

export async function DELETE(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { type?: CandidateDocumentType };
  if (!body.type || !documentTypes.includes(body.type)) return Response.json({ error: "Invalid document type." }, { status: 400 });
  const document = await portalStore.getCandidateDocument(session.candidateId, body.type);
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  if (!await deleteObject(document.storageKey)) return Response.json({ error: "Private file could not be removed from storage. Please try again." }, { status: 503 });
  await portalStore.deleteCandidateDocument(session.candidateId, body.type);
  return Response.json({ data: { deleted: true }, message: "Document deleted securely." });
}
