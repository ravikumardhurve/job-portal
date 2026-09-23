import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore, type CandidateDocumentType } from "@/lib/portal";
import { createDownloadUrl } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ type: CandidateDocumentType }>;
  if (!body.type) return Response.json({ error: "Document type is required." }, { status: 400 });
  const document = await portalStore.getCandidateDocument(session.candidateId, body.type);
  if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
  try {
    const url = await createDownloadUrl(document.storageKey);
    await portalStore.logCandidateDocumentAccess(session.candidateId, "CANDIDATE", session.candidateId, body.type, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
    return Response.json({ data: { url } });
  } catch {
    return Response.json({ error: "Cloudinary is not configured yet." }, { status: 503 });
  }
}
