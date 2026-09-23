import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminWorkspace role={session.role} />;
}
