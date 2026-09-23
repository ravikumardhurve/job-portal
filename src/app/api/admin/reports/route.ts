import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { reportData } from "@/lib/admin-operations";
import { toCsv } from "@/lib/csv";

const reportTypes = ["candidates", "applications", "jobs", "service-requests"] as const;
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as typeof reportTypes[number] | null;
  if (!type || !reportTypes.includes(type)) return Response.json({ error: "Valid report type required hai." }, { status: 400 });
  const rows = await reportData(type, getAdminScope(session), searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined) as Array<Record<string, unknown>>;
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
