import { AdminSectionShell } from "@/components/admin-section-shell";
import { getAdminSession } from "@/lib/admin-auth";
import { portalStore } from "@/lib/portal";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  const settings = session ? await portalStore.getSiteSettings() : undefined;
  return <AdminSectionShell role={session?.role} name={session?.name} companyName={settings?.companyName} businessVerticals={session?.businessVerticals}>{children}</AdminSectionShell>;
}
