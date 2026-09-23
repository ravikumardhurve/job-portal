import { getAdminSession } from "@/lib/admin-auth";
import { listAuditLogs } from "@/lib/admin-operations";

export async function GET(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  return Response.json({ data: await listAuditLogs({ q: searchParams.get("q") ?? undefined, action: searchParams.get("action") ?? undefined, from: searchParams.get("from") ?? undefined, to: searchParams.get("to") ?? undefined }) });
}
