import { redirect } from "next/navigation";
import { AdminJobManager } from "@/components/admin-job-manager";
import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { BUSINESS_VERTICALS } from "@/lib/admin-scope";

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ create?: string | string[] }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const scope = getAdminScope(session);
  const initialCreate = (await searchParams).create === "1";
  return <AdminJobManager key={initialCreate ? "create" : "list"} initialCreate={initialCreate} allowedVerticals={scope.all ? [...BUSINESS_VERTICALS] : scope.verticals} canChooseVertical={scope.all} />;
}
