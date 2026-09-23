import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore, type Address } from "@/lib/portal";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ currentAddress: Address; permanentAddress: Address & { sameAsCurrent?: boolean } }>;
  if (!body.currentAddress) return Response.json({ error: "Current address is required." }, { status: 400 });
  const data = await portalStore.updateCandidateAddress(session.candidateId, { currentAddress: body.currentAddress, permanentAddress: body.permanentAddress });
  const safeCandidate = { ...data, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}
