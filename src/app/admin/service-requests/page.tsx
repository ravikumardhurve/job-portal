import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminServiceRequestManager } from "@/components/admin-service-request-manager";

export default async function AdminServiceRequestsPage() {
  if (!await isAdminAuthenticated()) redirect("/admin/login");
  return <AdminServiceRequestManager />;
}
