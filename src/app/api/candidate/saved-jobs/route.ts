import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await portalStore.listSavedJobs(session.candidateId);
  return Response.json({ data });
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ jobId: string }>;
  if (!body.jobId) return Response.json({ error: "Job id is required." }, { status: 400 });
  try {
    const data = await portalStore.saveJob(session.candidateId, body.jobId);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_NOT_AVAILABLE") return Response.json({ error: "This job is no longer available." }, { status: 404 });
    throw error;
  }
}
