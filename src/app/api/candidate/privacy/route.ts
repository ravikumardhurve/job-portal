import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION, retentionReviewDate } from "@/lib/privacy";

export async function GET() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: { ...await portalStore.getCandidatePrivacySummary(session.candidateId), currentVersions: { privacyPolicy: PRIVACY_POLICY_VERSION, terms: TERMS_VERSION } } });
}

export async function PATCH(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { privacyConsent?: boolean; termsAccepted?: boolean };
  if (body.privacyConsent !== true || body.termsAccepted !== true) {
    return Response.json({ error: "Privacy Policy aur Terms dono accept karna zaroori hai." }, { status: 400 });
  }
  const acceptedAt = new Date().toISOString();
  const data = await portalStore.recordCandidatePolicyConsent(session.candidateId, PRIVACY_POLICY_VERSION, TERMS_VERSION, acceptedAt, retentionReviewDate(new Date(acceptedAt)));
  return Response.json({ data: { ...data, currentVersions: { privacyPolicy: PRIVACY_POLICY_VERSION, terms: TERMS_VERSION } }, message: "Privacy Policy aur Terms consent update ho gaya." });
}

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { reason?: string; confirmation?: string };
  if (body.confirmation !== "DELETE") return Response.json({ error: "Type DELETE to confirm the data deletion request." }, { status: 400 });
  const reason = body.reason?.trim();
  if (reason && reason.length > 500) return Response.json({ error: "Reason must be 500 characters or less." }, { status: 400 });
  try {
    return Response.json({ data: await portalStore.createCandidateDataDeletionRequest(session.candidateId, reason), message: "Your deletion request has been submitted." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRIVACY_REQUEST_EXISTS") return Response.json({ error: "A deletion request is already being reviewed." }, { status: 409 });
    throw error;
  }
}

export async function DELETE() {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ data: await portalStore.cancelCandidateDataDeletionRequest(session.candidateId), message: "Deletion request cancelled." });
  } catch (error) {
    if (error instanceof Error && error.message === "PRIVACY_REQUEST_NOT_FOUND") return Response.json({ error: "No cancellable request was found." }, { status: 404 });
    throw error;
  }
}
