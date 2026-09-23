import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getDatabase } from "@/lib/mongodb";
import type { BusinessVertical } from "@/lib/admin-scope";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "RECRUITER" | "PARTNER_ADMIN";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  businessVerticals?: BusinessVertical[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  loginCount?: number;
  passwordChangedAt?: string;
}

export async function authenticateAdmin(email: string, password: string, ipAddress?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDatabase();
  const user = await db.collection<AdminUser>("users").findOne({ email: normalizedEmail, status: "ACTIVE" });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) return null;
  const lastLoginAt = new Date().toISOString();
  await Promise.all([
    db.collection<AdminUser>("users").updateOne({ id: user.id }, { $set: { lastLoginAt, lastActivityAt: lastLoginAt }, $inc: { loginCount: 1 } }),
    db.collection("auditLogs").insertOne({ actorId: user.id, action: "ADMIN_LOGIN", targetType: "ADMIN_USER", targetId: user.id, metadata: {}, ...(ipAddress ? { ipAddress } : {}), createdAt: lastLoginAt }),
  ]);
  return { ...user, lastLoginAt, lastActivityAt: lastLoginAt, loginCount: (user.loginCount ?? 0) + 1 };
}

export type SafeAdminUser = Omit<AdminUser, "passwordHash">;

export async function listAdminUsers(): Promise<SafeAdminUser[]> {
  return (await getDatabase()).collection<AdminUser>("users")
    .find({ role: { $in: ["SUPER_ADMIN", "ADMIN", "RECRUITER", "PARTNER_ADMIN"] } }, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray() as unknown as SafeAdminUser[];
}

export async function createPartnerAdmin(input: { name: string; email: string; password: string; businessVertical: BusinessVertical; createdBy: string }) {
  const now = new Date().toISOString();
  const user: AdminUser = {
    id: `ADM-${randomUUID()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(input.password, 12),
    // RECRUITER is retained as the persisted partner role so existing MongoDB
    // validators remain compatible; businessVerticals provides the isolation.
    role: "RECRUITER",
    businessVerticals: [input.businessVertical],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDatabase();
  await db.collection<AdminUser>("users").insertOne(user);
  await db.collection("auditLogs").insertOne({ actorId: input.createdBy, action: "PARTNER_ADMIN_CREATED", targetType: "ADMIN_USER", targetId: user.id, metadata: { role: user.role, businessVerticals: user.businessVerticals }, createdAt: now });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessVerticals: user.businessVerticals,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateAdminUserStatus(userId: string, status: AdminUser["status"], updatedBy: string) {
  const db = await getDatabase();
  const user = await db.collection<AdminUser>("users").findOneAndUpdate(
    { id: userId, role: { $ne: "SUPER_ADMIN" } },
    { $set: { status, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { passwordHash: 0 } },
  );
  if (!user) throw new Error("ADMIN_USER_NOT_FOUND");
  await db.collection("auditLogs").insertOne({ actorId: updatedBy, action: "ADMIN_USER_STATUS_UPDATED", targetType: "ADMIN_USER", targetId: userId, metadata: { status }, createdAt: new Date().toISOString() });
  return user as unknown as SafeAdminUser;
}

export async function changeAdminPassword(userId: string, currentPassword: string, newPassword: string) {
  const db = await getDatabase();
  const user = await db.collection<AdminUser>("users").findOne({ id: userId, status: "ACTIVE" });
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) throw new Error("CURRENT_PASSWORD_INVALID");
  const changedAt = new Date().toISOString();
  await Promise.all([
    db.collection<AdminUser>("users").updateOne({ id: userId }, { $set: { passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: changedAt, updatedAt: changedAt } }),
    db.collection("auditLogs").insertOne({ actorId: userId, action: "ADMIN_PASSWORD_CHANGED", targetType: "ADMIN_USER", targetId: userId, metadata: {}, createdAt: changedAt }),
  ]);
}
