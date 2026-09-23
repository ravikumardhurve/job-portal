import bcrypt from "bcryptjs";
import { createCandidateSession, getCandidateSessionName } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as { mobile?: string; password?: string };
  if (!body.mobile || !body.password) return Response.json({ error: "Mobile number and password are required." }, { status: 400 });
  const candidate = await portalStore.getCandidateByMobile(body.mobile);
  if (!candidate?.passwordHash || !await bcrypt.compare(body.password, candidate.passwordHash)) return Response.json({ error: "Incorrect mobile number or password." }, { status: 401 });
  if (candidate.verificationStatus === "BLOCKED") return Response.json({ error: "This candidate account is blocked. Contact CG Job Care support." }, { status: 403 });
  const response = Response.json({ data: { id: candidate.id, fullName: candidate.fullName } });
  response.headers.append("Set-Cookie", `${getCandidateSessionName()}=${encodeURIComponent(createCandidateSession(candidate.id))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}