import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await portalStore.listAdminServiceRequests(getAdminScope(session)) });
}
