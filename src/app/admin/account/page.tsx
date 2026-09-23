import { redirect } from "next/navigation";
import { AdminAccountManager } from "@/components/admin-account-manager";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminAccountPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminAccountManager name={session.name} email={session.email} role={session.role} />;
}
