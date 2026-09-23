import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Please login as a candidate before applying." }, { status: 401 });
  const body = await request.json() as { jobId?: string };
  if (!body.jobId) return Response.json({ error: "jobId is required" }, { status: 400 });
  try {
    return Response.json({ data: await portalStore.createApplication(session.candidateId, body.jobId) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "DUPLICATE_APPLICATION" ? 409 : message === "PROFILE_INCOMPLETE" ? 422 : message === "CANDIDATE_NOT_ELIGIBLE" ? 403 : 404;
    const errors: Record<string, string> = { DUPLICATE_APPLICATION: "You have already applied for this job.", PROFILE_INCOMPLETE: "Please complete at least 55% of your profile before applying.", CANDIDATE_NOT_ELIGIBLE: "Your candidate account is not eligible to apply right now.", JOB_NOT_AVAILABLE: "This job is no longer available." };
    return Response.json({ error: errors[message] ?? "Could not submit application." }, { status });
  }
}