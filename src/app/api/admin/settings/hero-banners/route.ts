import { getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";

export async function GET() {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await portalStore.getSiteSettings();
  const keys = settings.heroBannerKeys ?? [];
  const banners = await Promise.all(keys.map(async (key) => ({ key, url: await createPublicDisplayUrl(key).catch(() => null) })));
  return Response.json({ data: banners.filter((banner) => banner.url) });
}
