import { portalStore, type ServiceRequest } from "@/lib/portal";

export async function POST(request: Request) {
  const body = await request.json() as Partial<Omit<ServiceRequest, "id" | "status" | "createdAt">>;
  if (!body.customerName || !body.mobile || !body.serviceType || !body.city || !body.address) return Response.json({ error: "Please complete all required service request fields." }, { status: 400 });
  const data = await portalStore.createServiceRequest({ customerName: body.customerName, mobile: body.mobile, serviceType: body.serviceType, city: body.city, address: body.address, staffRequired: body.staffRequired });
  return Response.json({ data, message: "Your service request has been submitted successfully." }, { status: 201 });
}