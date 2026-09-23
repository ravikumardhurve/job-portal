import { redirect } from "next/navigation";
import { AdminJobManager } from "@/components/admin-job-manager";
import { getAdminScope, getAdminSession } from "@/lib/admin-auth";
import { BUSINESS_VERTICALS } from "@/lib/admin-scope";

export default async function AdminJobsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const scope = getAdminScope(session);
  return <AdminJobManager allowedVerticals={scope.all ? [...BUSINESS_VERTICALS] : scope.verticals} canChooseVertical={scope.all} />;
}
