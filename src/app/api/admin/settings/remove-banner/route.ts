import { getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";
import { deleteObject, storageKeyBelongsTo } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ fileKey: string }>;
  if (!body.fileKey || !storageKeyBelongsTo(body.fileKey, "site-assets/HERO_BANNER/")) return Response.json({ error: "Invalid banner key." }, { status: 400 });
  const current = await portalStore.getSiteSettings();
  if (!(current.heroBannerKeys ?? []).includes(body.fileKey)) return Response.json({ error: "Banner not found." }, { status: 404 });
  const heroBannerKeys = (current.heroBannerKeys ?? []).filter((key) => key !== body.fileKey);
  const data = await portalStore.updateSiteSettings({ heroBannerKeys }, session.email);
  await deleteObject(body.fileKey);
  return Response.json({ data, message: "Banner removed." });
}
