import { portalStore, type JobStatus } from "@/lib/portal";

const validStatuses: JobStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"];

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/jobs/[jobId]">) {
  const { jobId } = await params;
  const body = await request.json() as { status?: JobStatus };
  if (!body.status || !validStatuses.includes(body.status)) return Response.json({ error: "A valid job status is required." }, { status: 400 });
  try {
    return Response.json({ data: portalStore.updateJobStatus(jobId, body.status) });
  } catch {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
}