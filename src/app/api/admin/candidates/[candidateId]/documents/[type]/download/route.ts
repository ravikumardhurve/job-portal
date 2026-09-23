import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore, type CandidateDocumentType } from "@/lib/portal";
import { createDownloadUrl } from "@/lib/storage";

const documentTypes: CandidateDocumentType[] = ["RESUME", "AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO", "POLICE_VERIFICATION", "EXPERIENCE_CERTIFICATE", "EDUCATION_CERTIFICATE", "OTHER"];

export async function POST(request: Request, { params }: RouteContext<"/api/admin/candidates/[candidateId]/documents/[type]/download">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { candidateId, type: rawType } = await params;
  const type = rawType as CandidateDocumentType;
  if (!documentTypes.includes(type)) return Response.json({ error: "Invalid document type." }, { status: 400 });
  try {
    const document = await portalStore.getAdminCandidateDocument(candidateId, type, getAdminScope(session));
    const url = await createDownloadUrl(document.storageKey);
    await portalStore.logCandidateDocumentAccess(session.id, "ADMIN", candidateId, type, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
    return Response.json({ data: { url } });
  } catch {
    return Response.json({ error: "Document could not be opened." }, { status: 404 });
  }
}
