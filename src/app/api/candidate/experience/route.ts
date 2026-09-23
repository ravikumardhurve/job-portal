import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await portalStore.getCandidateExperience(session.candidateId);
  return Response.json({ data: data ?? null });
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ experienceType: "FRESHER" | "EXPERIENCED"; totalExperienceYears: number; company: string; jobRole: string; salary: string; startDate: string; endDate: string; responsibilities: string }>;
  if (body.experienceType !== "FRESHER" && body.experienceType !== "EXPERIENCED") return Response.json({ error: "Please select whether you are a fresher or experienced." }, { status: 400 });
  const data = await portalStore.upsertCandidateExperience(session.candidateId, { experienceType: body.experienceType, totalExperienceYears: body.totalExperienceYears, company: body.company, jobRole: body.jobRole, salary: body.salary, startDate: body.startDate, endDate: body.endDate, responsibilities: body.responsibilities });
  const safeCandidate = { ...data, passwordHash: undefined };
  delete safeCandidate.passwordHash;
  return Response.json({ data: safeCandidate });
}
