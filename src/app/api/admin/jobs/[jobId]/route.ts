import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { parseAdminJobInput, type AdminJobBody } from "@/lib/admin-job-input";
import { portalStore, type JobStatus } from "@/lib/portal";
import { duplicateJob, recordAudit } from "@/lib/admin-operations";

const validStatuses: JobStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"];

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/jobs/[jobId]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await params;
  const body = await request.json() as AdminJobBody & { status?: JobStatus; archiveConfirmation?: string };
  try {
    const scope = getAdminScope(session);
    const isStatusOnly = Boolean(body.status) && !body.title;
    if (isStatusOnly) {
      if (!body.status || !validStatuses.includes(body.status)) return Response.json({ error: "A valid job status is required." }, { status: 400 });
      if (body.status === "ARCHIVED" && body.archiveConfirmation !== "ARCHIVE") return Response.json({ error: "Archive confirmation required hai." }, { status: 400 });
      const data = await portalStore.updateJobStatus(jobId, body.status, scope);
      await recordAudit(session.id, body.status === "ARCHIVED" ? "JOB_ARCHIVED" : "JOB_STATUS_UPDATED", "JOB", jobId, { status: body.status });
      return Response.json({ data });
    }
    const parsed = parseAdminJobInput(body, scope);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: parsed.status });
    const data = await portalStore.updateAdminJob(jobId, parsed.data, scope, body.publishNow ? "PUBLISHED" : undefined);
    await recordAudit(session.id, "JOB_UPDATED", "JOB", jobId, { published: Boolean(body.publishNow) });
    return Response.json({ data, message: body.publishNow ? "Job updated and published." : "Job details updated." });
  } catch (error) {
    if (error instanceof Error && error.message !== "JOB_NOT_FOUND") throw error;
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/admin/jobs/[jobId]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await params;
  const body = await request.json() as { action?: string };
  if (body.action !== "duplicate") return Response.json({ error: "Invalid job action." }, { status: 400 });
  try {
    const data = await duplicateJob(jobId, session.id, getAdminScope(session));
    return Response.json({ data, message: "Job draft duplicate create ho gaya." }, { status: 201 });
  } catch {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
}
