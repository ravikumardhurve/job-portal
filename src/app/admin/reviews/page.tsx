import { redirect } from "next/navigation";
import { AdminReviewManager } from "@/components/admin-review-manager";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminReviewsPage() {
  if (!await isAdminAuthenticated(["SUPER_ADMIN", "ADMIN"])) redirect("/admin");
  return (
    <main>
      <p className="text-xs font-black tracking-[.1em] text-[#E95D2B]">CUSTOMER TRUST</p>
      <h1 className="mt-2 text-3xl font-black">Customer reviews</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#71837A]">Customer feedback ko verify karke approve ya reject karein. Public service pages par sirf approved reviews dikhte hain.</p>
      <div className="mt-7"><AdminReviewManager /></div>
    </main>
  );
}
