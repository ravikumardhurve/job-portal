"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Building2, Globe, ImageIcon, MapPin, Phone, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import type { SiteSettings } from "@/lib/portal";
import type { SiteAssetType } from "@/lib/storage";
import { uploadDirectlyToCloudinary, type CloudinaryUploadSignature } from "@/lib/cloudinary-upload";

const singleAssetFields: Array<{ type: SiteAssetType; label: string; hint: string; accept: string }> = [
  { type: "LOGO", label: "Site logo", hint: "PNG, JPG, SVG or WebP, up to 2MB", accept: "image/*" },
  { type: "FAVICON", label: "Favicon", hint: "PNG or ICO, up to 512KB", accept: "image/png,image/x-icon,.ico" },
];

type HeroBanner = { key: string; url: string };

export function SiteSettingsManager() {
  const [settings, setSettings] = useState<SiteSettings>();
  const [previews, setPreviews] = useState<Partial<Record<SiteAssetType, string | null>>>({});
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [uploading, setUploading] = useState<SiteAssetType>();
  const [removingBanner, setRemovingBanner] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const inputRefs = useRef<Partial<Record<SiteAssetType, HTMLInputElement | null>>>({});
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/settings");
    const result = await response.json() as { data?: SiteSettings; error?: string };
    if (!response.ok || !result.data) throw new Error(result.error ?? "Site settings load nahi ho sake.");
    setSettings(result.data);
    const [bannerResponse, ...previewResponses] = await Promise.all([
      fetch("/api/admin/settings/hero-banners"),
      ...singleAssetFields.map((field) => fetch(`/api/admin/settings/preview?type=${field.type}`)),
    ]);
    const bannerResult = await bannerResponse.json() as { data?: HeroBanner[]; error?: string };
    if (!bannerResponse.ok || !bannerResult.data) throw new Error(bannerResult.error ?? "Banners load nahi ho sake.");
    setHeroBanners(bannerResult.data);
    for (const [index, previewResponse] of previewResponses.entries()) {
      const preview = await previewResponse.json() as { data?: { url: string | null }; error?: string };
      if (!previewResponse.ok || !preview.data) throw new Error(preview.error ?? "Branding preview load nahi ho saka.");
      setPreviews((current) => ({ ...current, [singleAssetFields[index].type]: preview.data?.url ?? null }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Site settings load nahi ho sake."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json() as { data?: SiteSettings; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save settings."); return; }
    setSettings(result.data);
    setMessage("Site settings updated.");
  }

  async function handleFile(type: SiteAssetType, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(type);
    setError(undefined);
    try {
      const presignResponse = await fetch("/api/admin/settings/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, fileName: file.name, contentType: file.type, fileSize: file.size }) });
      const presignResult = await presignResponse.json() as { data?: CloudinaryUploadSignature; error?: string };
      if (!presignResponse.ok || !presignResult.data) throw new Error(presignResult.error ?? "Could not start upload.");
      const uploaded = await uploadDirectlyToCloudinary(file, presignResult.data);
      const confirmResponse = await fetch("/api/admin/settings/upload-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, publicId: uploaded.public_id, resourceType: uploaded.resource_type, deliveryType: uploaded.type, format: uploaded.format }) });
      const confirmResult = await confirmResponse.json() as { error?: string };
      if (!confirmResponse.ok) throw new Error(confirmResult.error ?? "Could not confirm upload.");
      await refresh();
      setMessage(type === "HERO_BANNER" ? "Banner added." : type === "LOGO" ? "Logo updated." : "Favicon updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload file.");
    } finally {
      setUploading(undefined);
    }
  }

  async function removeBanner(fileKey: string) {
    setRemovingBanner(fileKey);
    setError(undefined);
    try {
      const response = await fetch("/api/admin/settings/remove-banner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileKey }) });
      if (!response.ok) { const result = await response.json() as { error?: string }; throw new Error(result.error ?? "Could not remove banner."); }
      setHeroBanners((current) => current.filter((banner) => banner.key !== fileKey));
      setMessage("Banner removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove banner.");
    } finally {
      setRemovingBanner(undefined);
    }
  }

  if (!settings) return error ? <div role="alert" className="rounded-lg bg-[#FFF0E7] p-5 text-sm font-bold text-[#C9471E]">{error} <button type="button" onClick={() => { setError(undefined); void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Site settings load nahi ho sake.")); }} className="ml-2 underline">Retry</button></div> : <p role="status" className="text-sm font-semibold text-[#71837a]">Loading site settings...</p>;

  return (
    <div className="grid gap-6">
      {message && <p className="rounded-lg bg-[#e8f5ed] px-4 py-3 text-sm font-bold text-[#258653]">{message}</p>}
      {error && <p className="rounded-lg bg-[#fff0e7] px-4 py-3 text-sm font-bold text-[#c9471e]">{error}</p>}

      <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><ImageIcon size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">BRANDING ASSETS</p><h2 className="text-lg font-black">Logo &amp; favicon</h2></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {singleAssetFields.map((field) => (
            <div key={field.type} className="rounded-lg border border-dashed border-[#dce6df] p-4 text-center">
              <div className="mx-auto grid h-20 w-full place-items-center overflow-hidden rounded-md bg-[#f7faf8]">
                {previews[field.type] ? (
                  <Image src={previews[field.type] as string} alt={`${field.label} preview`} width={240} height={80} unoptimized className="h-full w-full object-contain" />
                ) : <span className="text-xs text-[#9aa8a1]">No file yet</span>}
              </div>
              <p className="mt-3 text-sm font-bold">{field.label}</p>
              <p className="mt-1 text-[11px] text-[#71837a]">{field.hint}</p>
              <input ref={(el) => { inputRefs.current[field.type] = el; }} type="file" accept={field.accept} className="hidden" onChange={(event) => handleFile(field.type, event)} />
              <button type="button" disabled={uploading === field.type} onClick={() => inputRefs.current[field.type]?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#e95d2b] px-3 py-2 text-xs font-bold text-[#c9471e] disabled:opacity-60">
                <UploadCloud size={14} /> {uploading === field.type ? "Uploading..." : previews[field.type] ? "Replace" : "Upload"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><ImageIcon size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">HOMEPAGE HERO</p><h2 className="text-lg font-black">Rotating banners</h2></div></div>
        <p className="mt-3 text-sm text-[#71837a]">Add one or more images — the homepage hero automatically cycles through them. With none uploaded, the hero shows a plain branded card instead of a photo.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {heroBanners.map((banner) => (
            <div key={banner.key} className="group relative overflow-hidden rounded-lg border border-[#dce6df]">
              <Image src={banner.url} alt="Hero banner preview" width={480} height={128} unoptimized className="h-32 w-full object-cover" />
              <button type="button" disabled={removingBanner === banner.key} onClick={() => removeBanner(banner.key)} aria-label="Remove banner" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white disabled:opacity-60">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" disabled={uploading === "HERO_BANNER"} onClick={() => bannerInputRef.current?.click()} className="grid h-32 place-items-center gap-2 rounded-lg border border-dashed border-[#dce6df] text-xs font-bold text-[#c9471e] disabled:opacity-60">
            <Plus size={18} /> {uploading === "HERO_BANNER" ? "Uploading..." : "Add banner"}
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile("HERO_BANNER", event)} />
        </div>
        <p className="mt-3 text-[11px] text-[#71837a]">JPG, PNG or WebP, up to 5MB each.</p>
      </section>

      <form onSubmit={submit} className="grid gap-6">
        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><ImageIcon size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">LANDING PAGE CONTENT</p><h2 className="text-lg font-black">Homepage headings &amp; messages</h2></div></div>
          <p className="mt-3 text-sm leading-6 text-[#71837a]">Homepage ke main headings aur descriptions yahan se update honge. Search intent clear rakhne ke liye service names aur location naturally mention karein.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Top announcement fallback"><input name="homeAnnouncementText" defaultValue={settings.homeAnnouncementText ?? ""} maxLength={160} className="admin-input" /></Field>
            <Field label="Hero location badge"><input name="homeHeroBadge" defaultValue={settings.homeHeroBadge ?? ""} maxLength={80} className="admin-input" /></Field>
            <Field label="Hero heading"><input name="homeHeroTitle" defaultValue={settings.homeHeroTitle ?? ""} maxLength={100} className="admin-input" /></Field>
            <Field label="Hero highlighted text"><input name="homeHeroHighlight" defaultValue={settings.homeHeroHighlight ?? ""} maxLength={100} className="admin-input" /></Field>
            <div className="md:col-span-2"><Field label="Hero description"><textarea name="homeHeroDescription" defaultValue={settings.homeHeroDescription ?? ""} maxLength={320} className="admin-input min-h-24 py-3" /></Field></div>
            <Field label="Services section title"><input name="homeServicesTitle" defaultValue={settings.homeServicesTitle ?? ""} maxLength={120} className="admin-input" /></Field>
            <Field label="Jobs section title"><input name="homeJobsTitle" defaultValue={settings.homeJobsTitle ?? ""} maxLength={120} className="admin-input" /></Field>
            <Field label="Services section description"><textarea name="homeServicesDescription" defaultValue={settings.homeServicesDescription ?? ""} maxLength={320} className="admin-input min-h-24 py-3" /></Field>
            <Field label="Jobs section description"><textarea name="homeJobsDescription" defaultValue={settings.homeJobsDescription ?? ""} maxLength={320} className="admin-input min-h-24 py-3" /></Field>
            <Field label="Final CTA title"><input name="homeCtaTitle" defaultValue={settings.homeCtaTitle ?? ""} maxLength={120} className="admin-input" /></Field>
            <Field label="Final CTA description"><textarea name="homeCtaDescription" defaultValue={settings.homeCtaDescription ?? ""} maxLength={320} className="admin-input min-h-24 py-3" /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><Building2 size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">COMPANY IDENTITY</p><h2 className="text-lg font-black">Name &amp; tagline</h2></div></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Company name"><input name="companyName" defaultValue={settings.companyName} required className="admin-input" /></Field>
            <Field label="Tagline"><input name="tagline" defaultValue={settings.tagline ?? ""} className="admin-input" /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><Globe size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">SEO</p><h2 className="text-lg font-black">Meta title &amp; description</h2></div></div>
          <div className="mt-5 grid gap-4">
            <Field label="Meta title"><input name="metaTitle" defaultValue={settings.metaTitle ?? ""} className="admin-input" /></Field>
            <Field label="Meta description"><textarea name="metaDescription" defaultValue={settings.metaDescription ?? ""} className="admin-input min-h-24 py-3" /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><Phone size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">CONTACT</p><h2 className="text-lg font-black">How customers reach you</h2></div></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Phone"><input name="phone" defaultValue={settings.phone ?? ""} className="admin-input" /></Field>
            <Field label="WhatsApp"><input name="whatsapp" defaultValue={settings.whatsapp ?? ""} className="admin-input" /></Field>
            <Field label="Email"><input name="email" type="email" defaultValue={settings.email ?? ""} className="admin-input" /></Field>
            <Field label="Facebook URL"><input name="facebookUrl" defaultValue={settings.facebookUrl ?? ""} className="admin-input" /></Field>
            <Field label="Instagram URL"><input name="instagramUrl" defaultValue={settings.instagramUrl ?? ""} className="admin-input" /></Field>
            <Field label="Google Business Profile URL"><input name="googleBusinessProfileUrl" type="url" defaultValue={settings.googleBusinessProfileUrl ?? ""} placeholder="https://g.page/..." className="admin-input" /></Field>
            <Field label="GST number"><input name="gstNumber" defaultValue={settings.gstNumber ?? ""} className="admin-input" /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><MapPin size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#e95d2b]">LOCATION</p><h2 className="text-lg font-black">Address &amp; hours</h2></div></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Address"><input name="address" defaultValue={settings.address ?? ""} className="admin-input" /></Field>
            <Field label="City"><input name="city" defaultValue={settings.city ?? ""} className="admin-input" /></Field>
            <Field label="State"><input name="state" defaultValue={settings.state ?? ""} className="admin-input" /></Field>
            <Field label="Working hours"><input name="workingHours" defaultValue={settings.workingHours ?? ""} className="admin-input" /></Field>
          </div>
        </section>

        <button disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#e95d2b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={16} /> {saving ? "Saving..." : "Save site settings"}</button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#3c4c44]">{label}{children}</label>;
}
