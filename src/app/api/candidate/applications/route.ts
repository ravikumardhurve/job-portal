import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await portalStore.listCandidateApplications(session.candidateId) });
}