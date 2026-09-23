import { redirect } from "next/navigation";
import { AdminEmployerRequirementManager } from "@/components/admin-employer-requirement-manager";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function EmployerRequirementsPage() {
  if (!await isAdminAuthenticated()) redirect("/admin/login");
  return <AdminEmployerRequirementManager />;
}
