import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as { candidateId?: string; jobId?: string };
  if (!body.candidateId || !body.jobId) return Response.json({ error: "candidateId and jobId are required" }, { status: 400 });
  try {
    return Response.json({ data: portalStore.createApplication(body.candidateId, body.jobId) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "DUPLICATE_APPLICATION" ? 409 : 404;
    return Response.json({ error: message }, { status });
  }
}