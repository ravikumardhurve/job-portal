import { portalStore } from "@/lib/portal";

export async function GET() {
  const categories = await portalStore.listJobCategories();
  return Response.json({ data: categories });
}
