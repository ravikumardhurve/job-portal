import { redirect } from "next/navigation";
import { AdminReports } from "@/components/admin-reports";
import { isAdminAuthenticated } from "@/lib/admin-auth";
export default async function ReportsPage() { if (!await isAdminAuthenticated()) redirect("/admin/login"); return <AdminReports />; }
