import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type SiteSettings } from "@/lib/portal";
import { createCloudinaryStorageKey, deleteObject, headObject, SITE_ASSET_UPLOAD_RULES, storageKeyBelongsTo, type SiteAssetType } from "@/lib/storage";
import { isServicePageSlug } from "@/lib/service-pages";

const singleAssetField: Partial<Record<SiteAssetType, keyof SiteSettings>> = {
  LOGO: "logoKey",
  FAVICON: "faviconKey",
};

const allowedFormats: Record<SiteAssetType, string[]> = {
  LOGO: ["jpg", "jpeg", "png", "svg", "webp"],
  FAVICON: ["png", "ico"],
  HERO_BANNER: ["jpg", "jpeg", "png", "webp"],
  SERVICE_HERO: ["jpg", "jpeg", "png", "webp"],
  SERVICE_GALLERY: ["jpg", "jpeg", "png", "webp"],
};

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ type: SiteAssetType; publicId: string; resourceType: "image" | "raw"; deliveryType: "upload" | "authenticated"; format: string; serviceSlug: string }>;
  const rules = body.type ? SITE_ASSET_UPLOAD_RULES[body.type] : undefined;
  if (!body.type || !rules || !body.publicId || body.resourceType !== "image" || body.deliveryType !== "upload") return Response.json({ error: "Invalid upload." }, { status: 400 });
  const isServiceAsset = body.type === "SERVICE_HERO" || body.type === "SERVICE_GALLERY";
  if (isServiceAsset && (!body.serviceSlug || !isServicePageSlug(body.serviceSlug))) return Response.json({ error: "Please select a valid service." }, { status: 400 });
  const expectedPrefix = isServiceAsset ? `site-assets/${body.type}/${body.serviceSlug}/` : `site-assets/${body.type}/`;
  const provisionalKey = createCloudinaryStorageKey({ resourceType: body.resourceType, deliveryType: body.deliveryType, format: body.format ?? "", publicId: body.publicId });
  if (!storageKeyBelongsTo(provisionalKey, expectedPrefix)) return Response.json({ error: "Invalid upload." }, { status: 403 });
  const head = await headObject(provisionalKey);
  if (!head) return Response.json({ error: "Upload could not be verified. Please try again." }, { status: 400 });
  const format = (head.Format || body.format || "").toLowerCase();
  const fileKey = createCloudinaryStorageKey({ resourceType: body.resourceType, deliveryType: body.deliveryType, format, publicId: body.publicId });
  if (!allowedFormats[body.type].includes(format)) {
    await deleteObject(fileKey);
    return Response.json({ error: "Uploaded image format is not allowed." }, { status: 400 });
  }
  if ((head.ContentLength ?? 0) > rules.maxSizeBytes) {
    await deleteObject(fileKey);
    return Response.json({ error: "Uploaded file is too large." }, { status: 400 });
  }

  if (body.type === "HERO_BANNER") {
    const current = await portalStore.getSiteSettings();
    const heroBannerKeys = [...(current.heroBannerKeys ?? []), fileKey];
    const data = await portalStore.updateSiteSettings({ heroBannerKeys }, session.email);
    return Response.json({ data, message: "Banner added." });
  }

  if (isServiceAsset && body.serviceSlug) {
    const current = await portalStore.getSiteSettings();
    const existing = current.serviceAssets?.[body.serviceSlug] ?? {};
    if (body.type === "SERVICE_GALLERY" && (existing.galleryKeys?.length ?? 0) >= 12) {
      await deleteObject(fileKey);
      return Response.json({ error: "A service gallery can contain up to 12 images." }, { status: 400 });
    }
    const nextAsset = body.type === "SERVICE_HERO"
      ? { ...existing, heroKey: fileKey }
      : { ...existing, galleryKeys: [...(existing.galleryKeys ?? []), fileKey] };
    const data = await portalStore.updateSiteSettings({ serviceAssets: { ...(current.serviceAssets ?? {}), [body.serviceSlug]: nextAsset } }, session.email);
    if (body.type === "SERVICE_HERO" && existing.heroKey && existing.heroKey !== fileKey) await deleteObject(existing.heroKey);
    return Response.json({ data, message: body.type === "SERVICE_HERO" ? "Service hero updated." : "Gallery image added." });
  }

  const field = singleAssetField[body.type];
  if (!field) return Response.json({ error: "Unknown asset type." }, { status: 400 });
  const current = await portalStore.getSiteSettings();
  const previousKey = current[field] as string | undefined;
  const data = await portalStore.updateSiteSettings({ [field]: fileKey }, session.email);
  if (previousKey && previousKey !== fileKey) await deleteObject(previousKey);
  return Response.json({ data, message: "Upload saved." });
}
