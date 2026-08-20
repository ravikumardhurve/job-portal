import { portalStore } from "@/lib/portal";

export async function GET() {
  return Response.json({ data: portalStore.getAdminDashboard() });
}