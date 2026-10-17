import { redirect } from "next/navigation";

export default function LegacyNewAdminJobPage() {
  redirect("/admin/jobs?create=1");
}
