import { getCandidateSession } from "@/lib/candidate-auth";
import { randomUUID } from "node:crypto";
import type { CandidateDocumentType } from "@/lib/portal";
import { createUploadSignature, DOCUMENT_UPLOAD_RULES } from "@/lib/storage";
import { portalStore } from "@/lib/portal";
import { DOCUMENT_CONSENT_VERSION } from "@/lib/privacy";

function sanitizeFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60) || "document";
}

function rawExtension(contentType: string) {
  if (contentType === "application/msword") return ".doc";
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return "";
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ type: CandidateDocumentType; fileName: string; contentType: string; fileSize: number; consent: boolean }>;
  const rules = body.type ? DOCUMENT_UPLOAD_RULES[body.type] : undefined;
  if (!body.type || !rules) return Response.json({ error: "Unknown document type." }, { status: 400 });
  if (!body.contentType || !rules.mimeTypes.includes(body.contentType)) return Response.json({ error: `Please upload a file of type: ${rules.mimeTypes.join(", ")}.` }, { status: 400 });
  if (!body.fileSize || body.fileSize > rules.maxSizeBytes) return Response.json({ error: `File must be smaller than ${Math.round(rules.maxSizeBytes / (1024 * 1024))}MB.` }, { status: 400 });
  if (body.consent !== true) return Response.json({ error: "Document processing consent is required before upload." }, { status: 400 });
  const resourceType = body.contentType.startsWith("image/") || body.contentType === "application/pdf" ? "image" : "raw";
  const publicId = `candidates/${session.candidateId}/${body.type}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFileName(body.fileName ?? "document")}${resourceType === "raw" ? rawExtension(body.contentType) : ""}`;
  try {
    await portalStore.recordCandidateDocumentConsent(session.candidateId, DOCUMENT_CONSENT_VERSION, new Date().toISOString());
    return Response.json({ data: createUploadSignature(publicId, resourceType, "authenticated") });
  } catch {
    return Response.json({ error: "Cloudinary is not configured yet. Please try again later." }, { status: 503 });
  }
}
