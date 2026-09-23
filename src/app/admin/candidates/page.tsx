import { CandidateManager } from "@/components/candidate-manager";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export default async function AdminCandidatesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <CandidateManager canDelete={session.role === "SUPER_ADMIN" || session.role === "ADMIN"} />;
}
