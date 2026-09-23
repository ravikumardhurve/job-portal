import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore, type Candidate } from "@/lib/portal";

const verificationStatuses: Candidate["verificationStatus"][] = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "BLOCKED"];
const availabilityStatuses = ["AVAILABLE", "INTERVIEWING", "SELECTED", "WORKING", "NOT_AVAILABLE"] as const;

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const verificationStatus = searchParams.get("verificationStatus") as Candidate["verificationStatus"] | null;
  const availability = searchParams.get("availability") as Candidate["availability"] | null;
  if (verificationStatus && !verificationStatuses.includes(verificationStatus)) return Response.json({ error: "Invalid verification status." }, { status: 400 });
  if (availability && !availabilityStatuses.includes(availability as typeof availabilityStatuses[number])) return Response.json({ error: "Invalid availability status." }, { status: 400 });
  return Response.json({ data: await portalStore.listCandidates({ query: searchParams.get("q") ?? undefined, verificationStatus: verificationStatus ?? undefined, availability: availability ?? undefined }, getAdminScope(session)) });
}
