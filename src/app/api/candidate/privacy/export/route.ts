import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await portalStore.getCandidateDataExport(session.candidateId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cg-job-care-data-${session.candidateId}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
