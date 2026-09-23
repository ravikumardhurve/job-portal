import { getAdminSession } from "@/lib/admin-auth";
import { portalStore, type SiteSettings } from "@/lib/portal";

export async function GET() {
  if (!await getAdminSession(["SUPER_ADMIN", "ADMIN"])) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await portalStore.getSiteSettings() });
}

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<SiteSettings>;
  if (body.companyName !== undefined && !body.companyName.trim()) return Response.json({ error: "Company name cannot be empty." }, { status: 400 });
  const data = await portalStore.updateSiteSettings(body, session.email);
  return Response.json({ data, message: "Site settings updated." });
}
