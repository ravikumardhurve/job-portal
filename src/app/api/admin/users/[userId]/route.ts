import { getAdminSession } from "@/lib/admin-auth";
import { updateAdminUserStatus } from "@/lib/admin-users";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getAdminSession(["SUPER_ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  const body = await request.json() as { status?: "ACTIVE" | "SUSPENDED" };
  if (body.status !== "ACTIVE" && body.status !== "SUSPENDED") return Response.json({ error: "Invalid account status." }, { status: 400 });
  try {
    return Response.json({ data: await updateAdminUserStatus(userId, body.status, session.id), message: "Account status updated." });
  } catch {
    return Response.json({ error: "Partner admin account not found." }, { status: 404 });
  }
}
