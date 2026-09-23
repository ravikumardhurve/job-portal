import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function DELETE(request: Request, { params }: RouteContext<"/api/candidate/saved-jobs/[jobId]">) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await params;
  await portalStore.unsaveJob(session.candidateId, jobId);
  return Response.json({ data: { jobId } });
}
