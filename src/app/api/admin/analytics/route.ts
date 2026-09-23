import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { getDashboardAnalytics } from "@/lib/admin-operations";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  return Response.json({ data: await getDashboardAnalytics(getAdminScope(session), searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined) });
}
