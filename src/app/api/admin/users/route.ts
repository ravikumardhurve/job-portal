import { MongoServerError } from "mongodb";
import { getAdminSession } from "@/lib/admin-auth";
import { createPartnerAdmin, listAdminUsers } from "@/lib/admin-users";
import { isBusinessVertical, type BusinessVertical } from "@/lib/admin-scope";

export async function GET() {
  const session = await getAdminSession(["SUPER_ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await listAdminUsers() });
}

export async function POST(request: Request) {
  const session = await getAdminSession(["SUPER_ADMIN"]);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { name?: string; email?: string; password?: string; businessVertical?: BusinessVertical };
  if (!body.name?.trim() || !body.email?.trim() || !body.password || !isBusinessVertical(body.businessVertical)) {
    return Response.json({ error: "Name, email, password and business field are required." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(body.email) || body.password.length < 10) {
    return Response.json({ error: "Enter a valid email and a password of at least 10 characters." }, { status: 400 });
  }
  try {
    const data = await createPartnerAdmin({ name: body.name, email: body.email, password: body.password, businessVertical: body.businessVertical, createdBy: session.id });
    return Response.json({ data, message: "Partner admin account created." }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return Response.json({ error: "An admin with this email already exists." }, { status: 409 });
    throw error;
  }
}
