import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { SiteSettingsManager } from "@/components/site-settings-manager";
import { ServiceAssetManager } from "@/components/service-asset-manager";
import { isCloudinaryConfigured } from "@/lib/storage";
import styles from "@/components/admin-management.module.css";

export default async function AdminSettingsPage() {
  if (!await isAdminAuthenticated(["SUPER_ADMIN", "ADMIN"])) redirect("/admin");
  const storageConfigured = isCloudinaryConfigured();
  return (
    <main className={styles.page}>
      <div className={styles.body}>
        <p className="text-xs font-bold tracking-[.1em] text-[#2447e5]">WEBSITE CONTROL</p>
        <h1 className="mt-2 text-3xl font-black">Website manager</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#657189]">Open a section to edit your branding, page content, contact details or service photos.</p>
        {!storageConfigured && <div className="mt-5 rounded-lg border border-[#F0C9A8] bg-[#FFF7ED] px-4 py-3 text-sm font-semibold leading-6 text-[#9A4A16]">Image storage abhi configured nahi hai. Upload enable karne ke liye `.env.local` mein Cloudinary cloud name, API key aur API secret add karein. Text settings abhi bhi save hongi aur default images active rahengi.</div>}
        <div className="mt-4 grid gap-4 sm:mt-6">
          <SiteSettingsManager />
          <ServiceAssetManager />
        </div>
      </div>
    </main>
  );
}
