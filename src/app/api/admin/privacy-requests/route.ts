import { getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getAdminSession(["SUPER_ADMIN", "ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await portalStore.listAdminCandidatePrivacyRequests() });
}
