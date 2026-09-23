import { AdminSectionShell } from "@/components/admin-section-shell";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  return <AdminSectionShell role={session?.role} name={session?.name} businessVerticals={session?.businessVerticals}>{children}</AdminSectionShell>;
}
