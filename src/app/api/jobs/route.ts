import { portalStore } from "@/lib/portal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return Response.json({ data: portalStore.listPublishedJobs(searchParams.get("q") ?? undefined, searchParams.get("city") ?? undefined) });
}