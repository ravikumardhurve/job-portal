import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await portalStore.getCandidateEducation(session.candidateId);
  return Response.json({ data: data ?? null });
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ qualification: string; course: string; specialization: string; institution: string; passingYear: string; percentage: string }>;
  if (!body.qualification?.trim()) return Response.json({ error: "Highest qualification is required." }, { status: 400 });
  const data = await portalStore.upsertCandidateEducation(session.candidateId, { qualification: body.qualification.trim(), course: body.course, specialization: body.specialization, institution: body.institution, passingYear: body.passingYear, percentage: body.percentage });
  const safeCandidate = { ...data, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}
