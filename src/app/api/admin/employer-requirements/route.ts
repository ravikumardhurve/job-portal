import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { listEmployerRequirements } from "@/lib/admin-operations";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await listEmployerRequirements(getAdminScope(session)) });
}
