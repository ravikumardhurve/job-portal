import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminApplicationManager } from "@/components/admin-application-manager";
export default async function AdminApplicationsPage() { if (!await isAdminAuthenticated()) redirect("/admin/login"); return <AdminApplicationManager />; }