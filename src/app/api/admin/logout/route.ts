import { getAdminSessionName } from "@/lib/admin-auth";

export async function POST() {
  const response = Response.json({ data: { authenticated: false } });
  response.headers.append("Set-Cookie", `${getAdminSessionName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
