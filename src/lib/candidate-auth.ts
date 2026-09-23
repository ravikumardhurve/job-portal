import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";

const sessionName = "cg_candidate_session";
type CandidateSession = { candidateId: string; expiresAt: number };

function secret() { return process.env.CANDIDATE_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET; }
function signature(value: string) { const key = secret(); if (!key) throw new Error("CANDIDATE_SESSION_SECRET is not configured."); return createHmac("sha256", key).update(value).digest("base64url"); }

export function createCandidateSession(candidateId: string) { const payload = Buffer.from(JSON.stringify({ candidateId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 } satisfies CandidateSession)).toString("base64url"); return `${payload}.${signature(payload)}`; }
export function getCandidateSessionName() { return sessionName; }
export async function getCandidateSession() {
  const token = (await cookies()).get(sessionName)?.value;
  if (!token || !secret()) return null;
  const [payload, signed] = token.split(".");
  if (!payload || !signed) return null;
  const expected = Buffer.from(signature(payload));
  const received = Buffer.from(signed);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CandidateSession;
    if (session.expiresAt <= Date.now()) return null;
    const candidate = await (await getDatabase()).collection("candidates").findOne(
      { id: session.candidateId, verificationStatus: { $ne: "BLOCKED" }, deletedAt: { $exists: false } },
      { projection: { id: 1 } },
    );
    return candidate ? session : null;
  } catch {
    return null;
  }
}
