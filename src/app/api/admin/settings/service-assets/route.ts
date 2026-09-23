import { getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";
import { isServicePageSlug, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { createPublicDisplayUrl, deleteObject } from "@/lib/storage";

export async function GET() {
  if (!await getAdminSession(["SUPER_ADMIN", "ADMIN"])) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await portalStore.getSiteSettings();
  const data = Object.fromEntries(await Promise.all(SERVICE_PAGE_SLUGS.map(async (slug) => {
    const asset = settings.serviceAssets?.[slug];
    const hero = asset?.heroKey ? { key: asset.heroKey, url: await createPublicDisplayUrl(asset.heroKey).catch(() => null) } : null;
    const gallery = await Promise.all((asset?.galleryKeys ?? []).map(async (key) => ({ key, url: await createPublicDisplayUrl(key).catch(() => null) })));
    return [slug, { hero: hero?.url ? hero : null, gallery: gallery.filter((image) => image.url) }];
  })));
  return Response.json({ data });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ serviceSlug: string; kind: "hero" | "gallery"; fileKey: string }>;
  if (!body.serviceSlug || !isServicePageSlug(body.serviceSlug) || !body.fileKey || !body.kind) return Response.json({ error: "Invalid service image." }, { status: 400 });
  const current = await portalStore.getSiteSettings();
  const existing = current.serviceAssets?.[body.serviceSlug] ?? {};
  const belongsToService = body.kind === "hero" ? existing.heroKey === body.fileKey : (existing.galleryKeys ?? []).includes(body.fileKey);
  if (!belongsToService) return Response.json({ error: "Image not found." }, { status: 404 });
  const nextAsset = body.kind === "hero"
    ? { ...existing, heroKey: undefined }
    : { ...existing, galleryKeys: (existing.galleryKeys ?? []).filter((key) => key !== body.fileKey) };
  const data = await portalStore.updateSiteSettings({ serviceAssets: { ...(current.serviceAssets ?? {}), [body.serviceSlug]: nextAsset } }, session.email);
  await deleteObject(body.fileKey);
  return Response.json({ data, message: "Service image removed." });
}
