import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export async function POST(request: Request) {
  const session = await getCandidateSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Partial<{ notificationId: string; all: boolean }>;
  if (body.all) {
    await portalStore.markAllNotificationsRead(session.candidateId);
  } else if (body.notificationId) {
    await portalStore.markNotificationRead(session.candidateId, body.notificationId);
  } else {
    return Response.json({ error: "notificationId or all is required." }, { status: 400 });
  }
  return Response.json({ data: { success: true } });
}
