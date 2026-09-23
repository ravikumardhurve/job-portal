import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const candidate = await portalStore.getCandidateById(session.candidateId);
  if (!candidate) return Response.json({ error: "Candidate not found" }, { status: 404 });
  const safeCandidate = { ...candidate, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}

export async function PATCH(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { city?: string; preferredRole?: string; email?: string };
  const data = await portalStore.updateCandidateProfile(session.candidateId, { city: body.city?.trim(), preferredRole: body.preferredRole?.trim(), email: body.email?.trim() });
  const safeCandidate = { ...data, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}