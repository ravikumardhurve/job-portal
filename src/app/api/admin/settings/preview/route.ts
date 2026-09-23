import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type SiteSettings } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";

const settingsField: Partial<Record<string, keyof SiteSettings>> = {
  LOGO: "logoKey",
  FAVICON: "faviconKey",
};

export async function GET(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const type = new URL(request.url).searchParams.get("type");
  const field = type ? settingsField[type] : undefined;
  if (!field) return Response.json({ error: "Unknown asset type." }, { status: 400 });
  const settings = await portalStore.getSiteSettings();
  const key = settings[field] as string | undefined;
  if (!key) return Response.json({ data: { url: null } });
  try {
    return Response.json({ data: { url: await createPublicDisplayUrl(key) } });
  } catch {
    return Response.json({ data: { url: null } });
  }
}
