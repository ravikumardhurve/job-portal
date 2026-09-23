import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore, type JobPreference } from "@/lib/portal";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as JobPreference;
  const data = await portalStore.updateCandidateJobPreference(session.candidateId, body);
  const safeCandidate = { ...data, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}
