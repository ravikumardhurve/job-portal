import bcrypt from "bcryptjs";
import { portalStore } from "@/lib/portal";
import { createCandidateSession, getCandidateSessionName } from "@/lib/candidate-auth";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION, retentionReviewDate } from "@/lib/privacy";

export async function POST(request: Request) {
  const body = await request.json() as Partial<{ fullName: string; mobile: string; email: string; city: string; password: string; privacyConsent: boolean; termsAccepted: boolean; isAdult: boolean }>;
  const fullName = body.fullName?.trim();
  const mobile = body.mobile?.trim();
  const email = body.email?.trim().toLowerCase();
  const city = body.city?.trim();
  if (!fullName || !mobile || !email || !city || !body.password) return Response.json({ error: "Name, mobile number, email, location and password are required." }, { status: 400 });
  if (fullName.length < 2 || fullName.length > 100) return Response.json({ error: "Please enter a valid full name." }, { status: 400 });
  if (!/^\d{10}$/.test(mobile)) return Response.json({ error: "Please enter a valid 10 digit mobile number." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (city.length < 2 || city.length > 100) return Response.json({ error: "Please enter a valid location." }, { status: 400 });
  if (body.password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (body.isAdult !== true) return Response.json({ error: "Candidate registration is available only for people aged 18 or above." }, { status: 400 });
  if (body.privacyConsent !== true || body.termsAccepted !== true) return Response.json({ error: "Privacy Policy and Terms acceptance is required." }, { status: 400 });
  try {
    const acceptedAt = new Date().toISOString();
    const data = await portalStore.createCandidate({
      fullName,
      mobile,
      email,
      city,
      passwordHash: await bcrypt.hash(body.password, 12),
      retentionReviewAt: retentionReviewDate(new Date(acceptedAt)),
      consents: { privacyPolicyVersion: PRIVACY_POLICY_VERSION, privacyAcceptedAt: acceptedAt, termsVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt },
    });
    const safeCandidate = { ...data, passwordHash: undefined };
    delete safeCandidate.passwordHash;
    const response = Response.json({ data: safeCandidate, message: "Registration successful. Complete your profile to apply for jobs." }, { status: 201 });
    response.headers.append("Set-Cookie", `${getCandidateSessionName()}=${encodeURIComponent(createCandidateSession(data.id))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_MOBILE") return Response.json({ error: "A candidate is already registered with this mobile number." }, { status: 409 });
    if (error instanceof Error && error.message === "DUPLICATE_EMAIL") return Response.json({ error: "A candidate is already registered with this email address." }, { status: 409 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
