import { getAdminSession } from "@/lib/admin-auth";
import { randomUUID } from "node:crypto";
import { createUploadSignature, SITE_ASSET_UPLOAD_RULES, type SiteAssetType } from "@/lib/storage";
import { isServicePageSlug } from "@/lib/service-pages";

function sanitizeFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60) || "image";
}

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ type: SiteAssetType; fileName: string; contentType: string; fileSize: number; serviceSlug: string }>;
  const rules = body.type ? SITE_ASSET_UPLOAD_RULES[body.type] : undefined;
  if (!body.type || !rules) return Response.json({ error: "Unknown asset type." }, { status: 400 });
  if (!body.contentType || !rules.mimeTypes.includes(body.contentType)) return Response.json({ error: `Please upload a file of type: ${rules.mimeTypes.join(", ")}.` }, { status: 400 });
  if (!body.fileSize || body.fileSize > rules.maxSizeBytes) return Response.json({ error: `File must be smaller than ${Math.round(rules.maxSizeBytes / 1024)}KB.` }, { status: 400 });
  const isServiceAsset = body.type === "SERVICE_HERO" || body.type === "SERVICE_GALLERY";
  if (isServiceAsset && (!body.serviceSlug || !isServicePageSlug(body.serviceSlug))) return Response.json({ error: "Please select a valid service." }, { status: 400 });
  const folder = isServiceAsset ? `${body.type}/${body.serviceSlug}` : body.type;
  const publicId = `site-assets/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFileName(body.fileName ?? "image")}`;
  try {
    return Response.json({ data: createUploadSignature(publicId, "image", "upload") });
  } catch {
    return Response.json({ error: "Cloudinary is not configured yet. Add its credentials in .env.local." }, { status: 503 });
  }
}
