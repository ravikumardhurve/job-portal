import { mobileHandler } from "@/lib/mobile/handler";
import { withMobileCors } from "@/lib/mobile/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  return withMobileCors(request, async () => mobileHandler(request, (await context.params).path));
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE, handle as OPTIONS };
