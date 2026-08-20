import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as Partial<{ fullName: string; mobile: string; email: string; preferredRole: string; city: string }>;
  if (!body.fullName || !body.mobile) return Response.json({ error: "Full name and mobile number are required." }, { status: 400 });
  if (!/^\d{10}$/.test(body.mobile)) return Response.json({ error: "Please enter a valid 10 digit mobile number." }, { status: 400 });
  try {
    const data = portalStore.createCandidate({ fullName: body.fullName, mobile: body.mobile, email: body.email, preferredRole: body.preferredRole, city: body.city });
    return Response.json({ data, message: "Registration started successfully. Complete your profile to apply for jobs." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_MOBILE") return Response.json({ error: "A candidate is already registered with this mobile number." }, { status: 409 });
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}