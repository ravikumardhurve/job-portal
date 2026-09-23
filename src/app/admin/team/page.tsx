import { redirect } from "next/navigation";
import { AdminUserManager } from "@/components/admin-user-manager";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminTeamPage() {
  if (!await getAdminSession(["SUPER_ADMIN"])) redirect("/admin");
  return <AdminUserManager />;
}
