import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { parseAdminJobInput, type AdminJobBody } from "@/lib/admin-job-input";
import { portalStore } from "@/lib/portal";
import { expireOverdueJobs, recordAudit } from "@/lib/admin-operations";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const scope = getAdminScope(session);
  await expireOverdueJobs(scope);
  return Response.json({ data: await portalStore.listAdminJobs(scope) });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const scope = getAdminScope(session);
  const body = await request.json() as AdminJobBody;
  const parsed = parseAdminJobInput(body, scope);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: parsed.status });
  const initialStatus = body.publishNow ? "PUBLISHED" : "DRAFT";
  const data = await portalStore.createAdminJob(parsed.data, initialStatus);
  await recordAudit(session.id, "JOB_CREATED", "JOB", data.id, { status: initialStatus, businessVertical: data.businessVertical });
  return Response.json({ data, message: initialStatus === "PUBLISHED" ? "Job created and published." : "Job saved as Draft." }, { status: 201 });
}
