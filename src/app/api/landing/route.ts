import { portalStore } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ data: await portalStore.getPublicLanding() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}