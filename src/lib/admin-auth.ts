import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AdminRole, AdminUser } from "@/lib/admin-users";
import { getDatabase } from "@/lib/mongodb";
import { normalizeBusinessVerticals, type AdminScope, type BusinessVertical } from "@/lib/admin-scope";

const sessionName = "cg_admin_session";

export type AdminSession = { id: string; email: string; name: string; role: AdminRole; businessVerticals: BusinessVertical[]; expiresAt: number };

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSession(user: AdminUser) {
  const businessVerticals = normalizeBusinessVerticals(user.businessVerticals);
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, businessVerticals, expiresAt: Date.now() + 8 * 60 * 60 * 1000 } satisfies AdminSession)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function getAdminSession(allowedRoles?: readonly AdminRole[]) {
  if (!sessionSecret()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionName)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expectedSignature = sign(payload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (session.expiresAt <= Date.now() || !["SUPER_ADMIN", "ADMIN", "RECRUITER", "PARTNER_ADMIN"].includes(session.role)) return null;
    if (allowedRoles && !allowedRoles.includes(session.role)) return null;
    const user = await (await getDatabase()).collection<AdminUser>("users").findOne(
      { id: session.id, email: session.email, role: session.role, status: "ACTIVE" },
      { projection: { id: 1, email: 1, name: 1, role: 1, status: 1, businessVerticals: 1, lastActivityAt: 1 } },
    );
    if (!user) return null;
    if (!user.lastActivityAt || Date.now() - new Date(user.lastActivityAt).valueOf() > 5 * 60 * 1000) {
      await (await getDatabase()).collection<AdminUser>("users").updateOne({ id: user.id }, { $set: { lastActivityAt: new Date().toISOString() } });
    }
    return { ...session, name: user.name, businessVerticals: normalizeBusinessVerticals(user.businessVerticals) };
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated(allowedRoles?: readonly AdminRole[]) {
  return (await getAdminSession(allowedRoles)) !== null;
}

export function getAdminScope(session: AdminSession): AdminScope {
  if (session.role === "SUPER_ADMIN" || session.role === "ADMIN") return { all: true, verticals: [] };
  return { all: false, verticals: normalizeBusinessVerticals(session.businessVerticals) };
}

export function getAdminSessionName() {
  return sessionName;
}
