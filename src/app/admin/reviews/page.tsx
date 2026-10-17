import { redirect } from "next/navigation";
import { AdminReviewManager } from "@/components/admin-review-manager";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import styles from "@/components/admin-management.module.css";

export default async function AdminReviewsPage() {
  if (!await isAdminAuthenticated(["SUPER_ADMIN", "ADMIN"])) redirect("/admin");
  return (
    <main className={styles.page}>
      <p className="text-xs font-black tracking-[.1em] text-[#2447e5]">CUSTOMER TRUST</p>
      <h1 className="mt-2 text-3xl font-black">Customer reviews</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657189]">Review customer feedback. Only approved reviews appear on the public website.</p>
      <div className="mt-4 sm:mt-6"><AdminReviewManager /></div>
    </main>
  );
}
