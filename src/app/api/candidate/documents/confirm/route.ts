import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore, type CandidateDocumentType } from "@/lib/portal";
import { createCloudinaryStorageKey, deleteObject, DOCUMENT_UPLOAD_RULES, headObject, storageKeyBelongsTo } from "@/lib/storage";
import { DOCUMENT_CONSENT_VERSION, retentionReviewDate } from "@/lib/privacy";

const allowedFormats: Record<CandidateDocumentType, string[]> = {
  RESUME: ["pdf", "doc", "docx"],
  AADHAAR_FRONT: ["jpg", "jpeg", "png"],
  AADHAAR_BACK: ["jpg", "jpeg", "png"],
  PAN: ["jpg", "jpeg", "png"],
  PHOTO: ["jpg", "jpeg", "png"],
  POLICE_VERIFICATION: ["pdf", "jpg", "jpeg", "png"],
  EXPERIENCE_CERTIFICATE: ["pdf", "jpg", "jpeg", "png"],
  EDUCATION_CERTIFICATE: ["pdf", "jpg", "jpeg", "png"],
  OTHER: ["pdf", "jpg", "jpeg", "png"],
};

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ type: CandidateDocumentType; publicId: string; resourceType: "image" | "raw"; deliveryType: "upload" | "authenticated"; format: string }>;
  const rules = body.type ? DOCUMENT_UPLOAD_RULES[body.type] : undefined;
  if (!body.type || !rules || !body.publicId || (body.resourceType !== "image" && body.resourceType !== "raw") || body.deliveryType !== "authenticated") return Response.json({ error: "Invalid document upload." }, { status: 400 });
  const provisionalKey = createCloudinaryStorageKey({ resourceType: body.resourceType, deliveryType: body.deliveryType, format: body.format ?? "", publicId: body.publicId });
  if (!storageKeyBelongsTo(provisionalKey, `candidates/${session.candidateId}/${body.type}/`)) return Response.json({ error: "Invalid document upload." }, { status: 403 });
  const head = await headObject(provisionalKey);
  if (!head) return Response.json({ error: "Upload could not be verified. Please try again." }, { status: 400 });
  const format = (head.Format || body.format || body.publicId.split(".").pop() || "").toLowerCase();
  const fileKey = createCloudinaryStorageKey({ resourceType: body.resourceType, deliveryType: body.deliveryType, format, publicId: body.publicId });
  if (!allowedFormats[body.type].includes(format)) {
    await deleteObject(fileKey);
    return Response.json({ error: "Uploaded document format is not allowed." }, { status: 400 });
  }
  if ((head.ContentLength ?? 0) > rules.maxSizeBytes) {
    await deleteObject(fileKey);
    return Response.json({ error: "Uploaded file is too large." }, { status: 400 });
  }
  const acceptedAt = new Date().toISOString();
  const { candidate, replacedStorageKey } = await portalStore.confirmCandidateDocument(session.candidateId, body.type, fileKey, DOCUMENT_CONSENT_VERSION, acceptedAt, retentionReviewDate(new Date(acceptedAt)));
  if (replacedStorageKey && replacedStorageKey !== fileKey) await deleteObject(replacedStorageKey);
  const safeCandidate = { ...candidate, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}
