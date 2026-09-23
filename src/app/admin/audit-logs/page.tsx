import { redirect } from "next/navigation";
import { AdminAuditLogManager } from "@/components/admin-audit-log-manager";
import { getAdminSession } from "@/lib/admin-auth";
export default async function AuditLogsPage() { if (!await getAdminSession(["SUPER_ADMIN"])) redirect("/admin"); return <AdminAuditLogManager />; }
