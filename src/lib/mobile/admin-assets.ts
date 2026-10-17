import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { authenticate } from "./auth";
import { MobileError, readBody, textField } from "./contracts";
import { portalStore, type SiteSettings } from "@/lib/portal";
import { SERVICE_PAGES, SERVICE_PAGE_SLUGS, isServicePageSlug } from "@/lib/service-pages";
import { createCloudinaryStorageKey, createPublicDisplayUrl, createUploadSignature, deleteObject, headObject, SITE_ASSET_UPLOAD_RULES } from "@/lib/storage";

type Admin = Extract<Awaited<ReturnType<typeof authenticate>>, { kind: "admin" }>;
const types = ["HERO_BANNER", "SERVICE_HERO", "SERVICE_GALLERY"] as const;
type AssetType = typeof types[number];
type Target = { type: AssetType; serviceSlug?: string };
type Ticket = Target & { publicId: string; actor: string; expires: number; contentType: string; fileSize: number };
const formats: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
function only(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new MobileError("Unsupported field in request.");
}
function target(body: Record<string, unknown>): Target {
  if (!types.includes(body.type as AssetType)) throw new MobileError("Invalid asset type.");
  const type = body.type as AssetType;
  if (type === "HERO_BANNER") {
    if (body.serviceSlug !== undefined) throw new MobileError("Banners cannot belong to a service.");
    return { type };
  }
  if (typeof body.serviceSlug !== "string" || !isServicePageSlug(body.serviceSlug)) throw new MobileError("Invalid service.");
  return { type, serviceSlug: body.serviceSlug };
}
function prefix(asset: Target) { return `site-assets/${asset.type}/${asset.serviceSlug ? `${asset.serviceSlug}/` : ""}`; }
function validPublicId(publicId: string, asset: Target) {
  return publicId.startsWith(prefix(asset)) && /^[a-zA-Z0-9_-]{1,180}$/.test(publicId.slice(prefix(asset).length));
}
// Prefix checks alone are insufficient: private/raw keys and traversal must never pass.
function validKey(key: unknown, asset: Target): key is string {
  if (typeof key !== "string" || key.length > 800) return false;
  try {
    const [provider, resource, delivery, format, encoded, ...extra] = key.split(":");
    const publicId = decodeURIComponent(encoded ?? "");
    return provider === "cloudinary" && resource === "image" && delivery === "upload" && Object.hasOwn(formats, format) && !extra.length && validPublicId(publicId, asset)
      && key === createCloudinaryStorageKey({ resourceType: "image", deliveryType: "upload", format, publicId });
  } catch { return false; }
}
function validUrl(value: string, upload = false) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash
      && url.hostname === (upload ? "api.cloudinary.com" : "res.cloudinary.com")
      && (upload ? /^\/v1_1\/[^/]+\/image\/upload$/.test(url.pathname) : /^\/[^/]+\/image\/upload\//.test(url.pathname));
  } catch { return false; }
}
function mac(value: string) {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) throw new MobileError("Media storage is not configured.", 503);
  return createHmac("sha256", secret).update(`mobile-admin-assets:v1:${value}`).digest("base64url");
}
function issue(ticket: Ticket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${payload}.${mac(payload)}`;
}
function verify(receipt: string, asset: Target, publicId: string, actor: string): Ticket {
  const [payload, signature, ...extra] = receipt.split(".");
  const expected = Buffer.from(mac(payload));
  const actual = Buffer.from(signature ?? "");
  if (extra.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new MobileError("Invalid upload receipt.", 403);
  let ticket: Ticket;
  try { ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw new MobileError("Invalid upload receipt.", 403); }
  if (ticket.actor !== actor || ticket.type !== asset.type || ticket.serviceSlug !== asset.serviceSlug || ticket.publicId !== publicId || !Number.isFinite(ticket.expires) || ticket.expires < Date.now()) throw new MobileError("Upload receipt expired or does not match this upload.", 403);
  return ticket;
}
function keys(settings: SiteSettings, asset: Target): string[] {
  if (asset.type === "HERO_BANNER") return settings.heroBannerKeys ?? [];
  const service = settings.serviceAssets?.[asset.serviceSlug!];
  return asset.type === "SERVICE_HERO" ? service?.heroKey ? [service.heroKey] : [] : service?.galleryKeys ?? [];
}
async function save(settings: SiteSettings, asset: Target, next: string[], email: string) {
  if (asset.type === "HERO_BANNER") await portalStore.updateSiteSettings({ heroBannerKeys: next }, email);
  else {
    const serviceAssets = { ...settings.serviceAssets };
    const service = { ...serviceAssets[asset.serviceSlug!] };
    if (asset.type === "SERVICE_HERO") {
      if (next[0]) service.heroKey = next[0]; else delete service.heroKey;
    } else service.galleryKeys = next;
    serviceAssets[asset.serviceSlug!] = service;
    await portalStore.updateSiteSettings({ serviceAssets }, email);
  }
}
async function view(settings: SiteSettings, asset: Target) {
  return Promise.all(keys(settings, asset).filter(key => validKey(key, asset)).map(async key => {
    const url = await createPublicDisplayUrl(key).catch(() => null);
    // Keep a missing preview removable; never return untrusted or private URLs.
    return { key, url: url && validUrl(url) ? url : null };
  }));
}

/** Mount after authenticate() with the full path array. No cookie-based web handlers. */
export async function adminAssets(request: Request, path: string[], session: Admin): Promise<Response | null> {
  if (path[0] !== "admin" || path[1] !== "assets") return null;
  try {
    if (!session || session.kind !== "admin") throw new MobileError("Admin access required.", 403);
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role) || !session.scope.all) throw new MobileError("Full administrator access required.", 403);
    const action = path[2] ?? "";
    const methods: Record<string, string> = { "": "GET", "upload-url": "POST", "upload-confirm": "POST", remove: "DELETE", reorder: "PATCH" };
    if (path.length > 3 || !Object.hasOwn(methods, action)) throw new MobileError("Endpoint not found.", 404);
    if (request.method !== methods[action]) return new Response(null, { status: 405, headers: { Allow: methods[action], "Cache-Control": "private, no-store" } });
    if (!action) {
      const settings = await portalStore.getSiteSettings();
      return json({ data: {
        banners: await view(settings, { type: "HERO_BANNER" }),
        services: await Promise.all(SERVICE_PAGE_SLUGS.map(async serviceSlug => ({
          slug: serviceSlug, title: SERVICE_PAGES[serviceSlug].shortTitle,
          hero: (await view(settings, { type: "SERVICE_HERO", serviceSlug }))[0] ?? null,
          gallery: await view(settings, { type: "SERVICE_GALLERY", serviceSlug }),
        }))),
        rules: Object.fromEntries(types.map(type => [type, SITE_ASSET_UPLOAD_RULES[type]])), galleryLimit: 12,
      } });
    }
    const body = await readBody(request);
    const asset = target(body);
    const rules = SITE_ASSET_UPLOAD_RULES[asset.type];
    if (action === "upload-url") {
      only(body, ["type", "serviceSlug", "fileName", "contentType", "fileSize"]);
      const fileName = textField(body, "fileName", 1, 255);
      const contentType = textField(body, "contentType", 1, 80);
      if (!rules.mimeTypes.includes(contentType)) throw new MobileError("Choose a JPG, PNG or WebP image.");
      if (typeof body.fileSize !== "number" || !Number.isSafeInteger(body.fileSize) || body.fileSize <= 0 || body.fileSize > rules.maxSizeBytes) throw new MobileError("Choose a non-empty image up to 5 MB.");
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
      if (!Object.hasOwn(formats, extension) || formats[extension] !== contentType) throw new MobileError("File extension does not match its image type.");
      if (asset.type === "SERVICE_GALLERY" && keys(await portalStore.getSiteSettings(), asset).length >= 12) throw new MobileError("A service gallery can contain up to 12 images.");
      const name = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60) || "image";
      const publicId = `${prefix(asset)}${Date.now()}-${randomUUID().slice(0, 8)}-${name}`;
      let signature: ReturnType<typeof createUploadSignature>;
      try { signature = createUploadSignature(publicId, "image", "upload"); } catch { throw new MobileError("Media storage is not configured.", 503); }
      if (!validUrl(signature.uploadUrl, true)) throw new MobileError("Invalid media storage destination.", 503);
      const receipt = issue({ ...asset, publicId, actor: session.user.id, expires: Date.now() + 60 * 60 * 1000, contentType, fileSize: body.fileSize });
      return json({ data: { ...signature, resourceType: "image", receipt } });
    }
    if (action === "upload-confirm") {
      only(body, ["type", "serviceSlug", "publicId", "resourceType", "deliveryType", "receipt"]);
      const publicId = textField(body, "publicId", 1, 300);
      if (body.resourceType !== "image" || body.deliveryType !== "upload" || !validPublicId(publicId, asset)) throw new MobileError("Invalid public image namespace.", 403);
      const ticket = verify(textField(body, "receipt", 1, 3000), asset, publicId, session.user.id);
      const provisional = createCloudinaryStorageKey({ resourceType: "image", deliveryType: "upload", format: "", publicId });
      const head = await headObject(provisional);
      if (!head) throw new MobileError("Upload could not be verified. Retry saving the upload.");
      const format = (head.Format ?? "").toLowerCase();
      if (!Object.hasOwn(formats, format) || formats[format] !== ticket.contentType) throw new MobileError("Stored image format does not match the permitted upload type.");
      if (!Number.isSafeInteger(head.ContentLength) || !head.ContentLength || head.ContentLength <= 0 || head.ContentLength > rules.maxSizeBytes || head.ContentLength !== ticket.fileSize) throw new MobileError("Stored image size does not match the permitted upload size.");
      const fileKey = createCloudinaryStorageKey({ resourceType: "image", deliveryType: "upload", format, publicId });
      const url = await createPublicDisplayUrl(fileKey);
      if (!validUrl(url)) throw new MobileError("Invalid public image URL.");
      const settings = await portalStore.getSiteSettings();
      const current = keys(settings, asset);
      // Retry after a lost response must not duplicate a gallery/banner entry.
      if (current.includes(fileKey)) return json({ message: "Image already saved." });
      if (asset.type === "SERVICE_GALLERY" && current.length >= 12) throw new MobileError("A service gallery can contain up to 12 images.");
      await save(settings, asset, asset.type === "SERVICE_HERO" ? [fileKey] : [...current, fileKey], session.user.email);
      if (asset.type === "SERVICE_HERO") for (const old of current) if (validKey(old, asset)) await deleteObject(old);
      return json({ message: "Image saved." });
    }
    if (action === "remove") {
      only(body, ["type", "serviceSlug", "fileKey"]);
      if (!validKey(body.fileKey, asset)) throw new MobileError("Invalid public image key.", 403);
      const settings = await portalStore.getSiteSettings();
      const current = keys(settings, asset);
      if (!current.includes(body.fileKey)) throw new MobileError("Image not found.", 404);
      await save(settings, asset, current.filter(key => key !== body.fileKey), session.user.email);
      const removed = await deleteObject(body.fileKey);
      return json({ message: removed ? "Image removed." : "Image removed from the page. Storage cleanup is pending." });
    }
    only(body, ["type", "serviceSlug", "keys", "expectedKeys"]);
    if (asset.type === "SERVICE_HERO") throw new MobileError("A single hero image cannot be reordered.");
    if (!Array.isArray(body.keys) || !Array.isArray(body.expectedKeys) || !body.keys.every(key => validKey(key, asset)) || !body.expectedKeys.every(key => validKey(key, asset))) throw new MobileError("Invalid image order.");
    const settings = await portalStore.getSiteSettings();
    const current = keys(settings, asset);
    if (JSON.stringify(current) !== JSON.stringify(body.expectedKeys)) throw new MobileError("Images changed. Refresh before reordering.", 409);
    const next = body.keys as string[];
    if (new Set(next).size !== next.length || next.length !== current.length || next.some(key => !current.includes(key))) throw new MobileError("Order must contain every current image exactly once.");
    await save(settings, asset, next, session.user.email);
    return json({ message: "Image order saved." });
  } catch (error) {
    return json({ error: error instanceof MobileError ? error.message : "Media operation failed. Please retry." }, error instanceof MobileError ? error.status : 500);
  }
}
