import { v2 as cloudinary } from "cloudinary";
import type { CandidateDocumentType } from "@/lib/portal";

type CloudinaryResourceType = "image" | "raw";
type CloudinaryDeliveryType = "upload" | "authenticated";

type StoredCloudinaryAsset = {
  resourceType: CloudinaryResourceType;
  deliveryType: CloudinaryDeliveryType;
  format: string;
  publicId: string;
};

function configuredCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured.");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export function createCloudinaryStorageKey(asset: StoredCloudinaryAsset) {
  return ["cloudinary", asset.resourceType, asset.deliveryType, asset.format || "-", encodeURIComponent(asset.publicId)].join(":");
}

function parseCloudinaryStorageKey(key: string): StoredCloudinaryAsset {
  const [provider, resourceType, deliveryType, format, encodedPublicId, ...extra] = key.split(":");
  if (
    provider !== "cloudinary" ||
    (resourceType !== "image" && resourceType !== "raw") ||
    (deliveryType !== "upload" && deliveryType !== "authenticated") ||
    !encodedPublicId ||
    extra.length
  ) throw new Error("Invalid Cloudinary storage key.");
  return { resourceType, deliveryType, format: format === "-" ? "" : format, publicId: decodeURIComponent(encodedPublicId) };
}

export function storageKeyBelongsTo(key: string, publicIdPrefix: string) {
  try {
    return parseCloudinaryStorageKey(key).publicId.startsWith(publicIdPrefix);
  } catch {
    return false;
  }
}

export function createUploadSignature(publicId: string, resourceType: CloudinaryResourceType, deliveryType: CloudinaryDeliveryType) {
  const { cloudName, apiKey, apiSecret } = configuredCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureParams: Record<string, string | number> = { public_id: publicId, timestamp };
  if (deliveryType !== "upload") signatureParams.type = deliveryType;
  const signature = cloudinary.utils.api_sign_request(signatureParams, apiSecret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`,
    apiKey,
    timestamp,
    signature,
    publicId,
    deliveryType,
  };
}

export async function createDownloadUrl(key: string) {
  configuredCloudinary();
  const asset = parseCloudinaryStorageKey(key);
  if (asset.deliveryType === "authenticated") {
    return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + 300,
      attachment: true,
    });
  }
  return createPublicDisplayUrl(key);
}

export async function createPublicDisplayUrl(key: string) {
  configuredCloudinary();
  const asset = parseCloudinaryStorageKey(key);
  if (asset.deliveryType !== "upload") throw new Error("Private assets cannot be displayed publicly.");
  return cloudinary.url(asset.publicId, {
    secure: true,
    resource_type: asset.resourceType,
    type: asset.deliveryType,
    ...(asset.resourceType === "image" ? { fetch_format: "auto", quality: "auto:good" } : asset.format ? { format: asset.format } : {}),
  });
}

export async function deleteObject(key: string) {
  try {
    configuredCloudinary();
    const asset = parseCloudinaryStorageKey(key);
    await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
      invalidate: asset.deliveryType === "upload",
    });
    return true;
  } catch {
    // Cleanup is best effort; database state must remain usable if Cloudinary is unavailable.
    return false;
  }
}

export async function headObject(key: string) {
  try {
    configuredCloudinary();
    const asset = parseCloudinaryStorageKey(key);
    const resource = await cloudinary.api.resource(asset.publicId, {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
    }) as { bytes?: number; format?: string };
    return { ContentLength: resource.bytes, Format: resource.format ?? asset.format };
  } catch {
    return null;
  }
}

export const DOCUMENT_UPLOAD_RULES: Record<CandidateDocumentType, { mimeTypes: string[]; maxSizeBytes: number }> = {
  RESUME: { mimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSizeBytes: 5 * 1024 * 1024 },
  AADHAAR_FRONT: { mimeTypes: ["image/jpeg", "image/png"], maxSizeBytes: 2 * 1024 * 1024 },
  AADHAAR_BACK: { mimeTypes: ["image/jpeg", "image/png"], maxSizeBytes: 2 * 1024 * 1024 },
  PAN: { mimeTypes: ["image/jpeg", "image/png"], maxSizeBytes: 2 * 1024 * 1024 },
  PHOTO: { mimeTypes: ["image/jpeg", "image/png"], maxSizeBytes: 1 * 1024 * 1024 },
  POLICE_VERIFICATION: { mimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 5 * 1024 * 1024 },
  EXPERIENCE_CERTIFICATE: { mimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 5 * 1024 * 1024 },
  EDUCATION_CERTIFICATE: { mimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 5 * 1024 * 1024 },
  OTHER: { mimeTypes: ["application/pdf", "image/jpeg", "image/png"], maxSizeBytes: 5 * 1024 * 1024 },
};

export type SiteAssetType = "LOGO" | "FAVICON" | "HERO_BANNER" | "SERVICE_HERO" | "SERVICE_GALLERY";

export const SITE_ASSET_UPLOAD_RULES: Record<SiteAssetType, { mimeTypes: string[]; maxSizeBytes: number }> = {
  LOGO: { mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"], maxSizeBytes: 2 * 1024 * 1024 },
  FAVICON: { mimeTypes: ["image/png", "image/x-icon", "image/vnd.microsoft.icon"], maxSizeBytes: 512 * 1024 },
  HERO_BANNER: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 5 * 1024 * 1024 },
  SERVICE_HERO: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 5 * 1024 * 1024 },
  SERVICE_GALLERY: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxSizeBytes: 5 * 1024 * 1024 },
};
