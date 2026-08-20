import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as Partial<{ company: string; contactName: string; mobile: string; jobTitle: string; category: string; candidatesRequired: number; city: string }>;
  if (!body.company || !body.contactName || !body.mobile || !body.jobTitle || !body.category || !body.candidatesRequired || !body.city) return Response.json({ error: "Please complete all required requirement fields." }, { status: 400 });
  const data = portalStore.createEmployerRequirement({ company: body.company, contactName: body.contactName, mobile: body.mobile, jobTitle: body.jobTitle, category: body.category, candidatesRequired: body.candidatesRequired, city: body.city });
  return Response.json({ data, message: "Requirement received successfully. Our recruitment team will contact you shortly." }, { status: 201 });
}