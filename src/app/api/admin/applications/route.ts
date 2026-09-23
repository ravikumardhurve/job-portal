import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { portalStore, type ApplicationStatus } from "@/lib/portal";

const statuses: ApplicationStatus[] = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "JOINING_SCHEDULED", "JOINED", "REJECTED", "WITHDRAWN"];
export async function GET(request: Request) { const session = await getAdminSession(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 }); const status = new URL(request.url).searchParams.get("status") as ApplicationStatus | null; if (status && !statuses.includes(status)) return Response.json({ error: "Invalid application status." }, { status: 400 }); return Response.json({ data: await portalStore.listAdminApplications(status ?? undefined, getAdminScope(session)) }); }
