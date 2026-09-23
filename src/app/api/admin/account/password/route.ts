import { getAdminSession } from "@/lib/admin-auth";
import { changeAdminPassword } from "@/lib/admin-users";

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { currentPassword?: string; newPassword?: string };
  if (!body.currentPassword || !body.newPassword || body.newPassword.length < 10) return Response.json({ error: "Current password aur minimum 10-character new password required hai." }, { status: 400 });
  if (body.currentPassword === body.newPassword) return Response.json({ error: "New password current password se alag hona chahiye." }, { status: 400 });
  try {
    await changeAdminPassword(session.id, body.currentPassword, body.newPassword);
    return Response.json({ message: "Password successfully change ho gaya." });
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_PASSWORD_INVALID") return Response.json({ error: "Current password incorrect hai." }, { status: 400 });
    throw error;
  }
}
