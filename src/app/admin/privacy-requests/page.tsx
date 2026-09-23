import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminPrivacyRequestManager } from "@/components/admin-privacy-request-manager";

export default async function AdminPrivacyRequestsPage() {
  if (!await getAdminSession(["SUPER_ADMIN", "ADMIN"])) redirect("/admin");
  return <AdminPrivacyRequestManager />;
}
