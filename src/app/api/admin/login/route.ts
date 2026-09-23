import { authenticateAdmin } from "@/lib/admin-users";
import { createAdminSession, getAdminSessionName } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) return Response.json({ error: "Admin session is not configured. Set ADMIN_SESSION_SECRET." }, { status: 503 });
  if (!email || !password) return Response.json({ error: "Email and password are required." }, { status: 400 });
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const user = await authenticateAdmin(email, password, ipAddress);
  if (!user) return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  const response = Response.json({ data: { authenticated: true, role: user.role, name: user.name } });
  response.headers.append("Set-Cookie", `${getAdminSessionName()}=${encodeURIComponent(createAdminSession(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
