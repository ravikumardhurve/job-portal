import { pingDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDatabase();
    return Response.json({ status: "ok", database: "connected" });
  } catch {
    return Response.json({ status: "unavailable", database: "not connected" }, { status: 503 });
  }
}