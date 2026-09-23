import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { SiteSettingsManager } from "@/components/site-settings-manager";
import { ServiceAssetManager } from "@/components/service-asset-manager";
import { isCloudinaryConfigured } from "@/lib/storage";

export default async function AdminSettingsPage() {
  if (!await isAdminAuthenticated(["SUPER_ADMIN", "ADMIN"])) redirect("/admin");
  const storageConfigured = isCloudinaryConfigured();
  return (
    <main className="min-h-screen bg-[#f5f7f5] text-[#25372e]">
      <header className="border-b border-[#dfe8e1] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <a href="/admin" className="text-sm font-bold text-[#c9471e]">Back to admin</a>
          <span className="text-xs font-bold text-[#65786d]">Site settings</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">
        <p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">FULL WEBSITE CONTROL</p>
        <h1 className="mt-2 text-3xl font-black">Website manager</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#71837a]">Landing-page content, branding, service photos, galleries, SEO and contact information ko ek jagah se manage karein.</p>
        {!storageConfigured && <div className="mt-5 rounded-lg border border-[#F0C9A8] bg-[#FFF7ED] px-4 py-3 text-sm font-semibold leading-6 text-[#9A4A16]">Image storage abhi configured nahi hai. Upload enable karne ke liye `.env.local` mein Cloudinary cloud name, API key aur API secret add karein. Text settings abhi bhi save hongi aur default images active rahengi.</div>}
        <div className="mt-7 grid gap-6">
          <SiteSettingsManager />
          <ServiceAssetManager />
        </div>
      </div>
    </main>
  );
}
