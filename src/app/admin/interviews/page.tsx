import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminInterviewManager } from "@/components/admin-interview-manager";
export default async function AdminInterviewsPage() { if (!await isAdminAuthenticated()) redirect("/admin/login"); return <AdminInterviewManager />; }