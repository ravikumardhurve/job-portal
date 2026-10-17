import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/lib/mongodb";
import { authenticateAdmin, type AdminUser } from "@/lib/admin-users";
import { normalizeBusinessVerticals, type AdminScope } from "@/lib/admin-scope";
import { portalStore } from "@/lib/portal";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION, retentionReviewDate } from "@/lib/privacy";
import { candidateView, MobileError, textField } from "./contracts";

type Session = { tokenHash: string; userId: string; kind: "candidate" | "admin"; createdAt: Date; expiresAt: Date; credentialHash?: string };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function sessions() {
  const db = await getDatabase();
  const collection = db.collection<Session>("mobileSessions");
  await Promise.all([collection.createIndex({ tokenHash: 1 }, { unique: true }), collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })]);
  return collection;
}

// Shared MongoDB counters work across server processes. No raw identifiers stored.
async function throttle(identity: string) {
  const db = await getDatabase();
  const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("mobileAuthAttempts");
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const window = Math.floor(Date.now() / 900000);
  const record = await collection.findOneAndUpdate({ _id: digest(`${identity}:${window}`) }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 900000) } }, { upsert: true, returnDocument: "after" });
  if ((record?.count ?? 0) > 12) throw new MobileError("Too many attempts. Please try again in 15 minutes.", 429);
}

async function issue(userId: string, kind: Session["kind"], passwordHash?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (kind === "admin" ? 8 : 24 * 30) * 3600000);
  await (await sessions()).insertOne({ tokenHash: digest(token), userId, kind, createdAt: new Date(), expiresAt, credentialHash: passwordHash ? digest(passwordHash) : undefined });
  return { token, expiresAt: expiresAt.toISOString() };
}

function adminView(user: AdminUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, businessVerticals: normalizeBusinessVerticals(user.businessVerticals) };
}

export async function login(body: Record<string, unknown>) {
  const kind = body.kind;
  if (kind !== "candidate" && kind !== "admin") throw new MobileError("Choose a login type.");
  const identity = textField(body, "identity", 3).toLowerCase();
  const password = body.password;
  if (typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 72) throw new MobileError("Invalid password.");
  await throttle(`${kind}:${identity}`);
  if (kind === "admin") {
    const user = await authenticateAdmin(identity, password);
    if (!user || !["ADMIN", "SUPER_ADMIN", "RECRUITER", "PARTNER_ADMIN"].includes(user.role)) throw new MobileError("Incorrect email or password.", 401);
    return { ...(await issue(user.id, kind, user.passwordHash)), kind, user: adminView(user) };
  }
  const user = await portalStore.getCandidateByMobile(identity);
  if (!user?.passwordHash || !await bcrypt.compare(password, user.passwordHash)) throw new MobileError("Incorrect mobile number or password.", 401);
  if (user.verificationStatus === "BLOCKED") throw new MobileError("Account blocked. Please contact support.", 403);
  return { ...(await issue(user.id, kind, user.passwordHash)), kind, user: candidateView(user) };
}

export async function register(body: Record<string, unknown>) {
  const fullName = textField(body, "fullName", 2, 100);
  const mobile = textField(body, "mobile", 10, 10);
  const email = textField(body, "email", 5).toLowerCase();
  const city = textField(body, "city", 2, 100);
  const password = body.password;
  if (!/^\d{10}$/.test(mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MobileError("Enter a valid mobile number and email.");
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) throw new MobileError("Use a password of at least 8 characters, at most 72 UTF-8 bytes.");
  if (body.isAdult !== true || body.privacyConsent !== true || body.termsAccepted !== true) throw new MobileError("Confirm you are 18+ and accept the Privacy Policy and Terms.");
  await throttle(`register:${mobile}`);
  const acceptedAt = new Date().toISOString();
  const user = await portalStore.createCandidate({ fullName, mobile, email, city, passwordHash: await bcrypt.hash(password, 12), retentionReviewAt: retentionReviewDate(), consents: { privacyPolicyVersion: PRIVACY_POLICY_VERSION, privacyAcceptedAt: acceptedAt, termsVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt } });
  return { ...(await issue(user.id, "candidate", user.passwordHash)), kind: "candidate", user: candidateView(user) };
}

export async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new MobileError("Please sign in to continue.", 401);
  const session = await (await sessions()).findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  if (!session) throw new MobileError("Session expired. Please sign in again.", 401);
  const db = await getDatabase();
  if (session.kind === "admin") {
    const user = await db.collection<AdminUser>("users").findOne({ id: session.userId, status: "ACTIVE", role: { $in: ["ADMIN", "SUPER_ADMIN", "RECRUITER", "PARTNER_ADMIN"] } });
    if (!user || digest(user.passwordHash) !== session.credentialHash) throw new MobileError("Session expired. Please sign in again.", 401);
    const scope: AdminScope = { all: user.role === "ADMIN" || user.role === "SUPER_ADMIN", verticals: normalizeBusinessVerticals(user.businessVerticals) };
    return { kind: "admin" as const, user: adminView(user), scope, tokenHash: session.tokenHash };
  }
  const user = await portalStore.getCandidateById(session.userId);
  if (!user || user.verificationStatus === "BLOCKED" || !user.passwordHash || digest(user.passwordHash) !== session.credentialHash) throw new MobileError("Session expired. Please sign in again.", 401);
  return { kind: "candidate" as const, user: candidateView(user), tokenHash: session.tokenHash };
}

export async function logout(tokenHash: string) { await (await sessions()).deleteOne({ tokenHash }); }
