"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Plus, Trash2, UploadCloud } from "lucide-react";
import { SERVICE_PAGES, SERVICE_PAGE_SLUGS, type ServicePageSlug } from "@/lib/service-pages";
import type { SiteAssetType } from "@/lib/storage";
import { uploadDirectlyToCloudinary, type CloudinaryUploadSignature } from "@/lib/cloudinary-upload";

type StoredImage = { key: string; url: string };
type AssetData = Record<ServicePageSlug, { hero: StoredImage | null; gallery: StoredImage[] }>;

export function ServiceAssetManager() {
  const [assets, setAssets] = useState<AssetData>();
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function refresh() {
    const response = await fetch("/api/admin/settings/service-assets");
    const result = await response.json() as { data?: AssetData; error?: string };
    if (!response.ok || !result.data) throw new Error(result.error ?? "Service images load nahi ho sake.");
    setAssets(result.data);
  }

  useEffect(() => {
    fetch("/api/admin/settings/service-assets").then(async (response) => {
      const result = await response.json() as { data?: AssetData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Service images load nahi ho sake.");
      setAssets(result.data);
    }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Service images load nahi ho sake."));
  }, []);

  async function upload(serviceSlug: ServicePageSlug, type: Extract<SiteAssetType, "SERVICE_HERO" | "SERVICE_GALLERY">, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const operation = `${serviceSlug}:${type}`;
    setBusy(operation);
    setError(undefined);
    setMessage(undefined);
    try {
      const presignResponse = await fetch("/api/admin/settings/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, serviceSlug, fileName: file.name, contentType: file.type, fileSize: file.size }) });
      const presignResult = await presignResponse.json() as { data?: CloudinaryUploadSignature; error?: string };
      if (!presignResponse.ok || !presignResult.data) throw new Error(presignResult.error ?? "Upload start nahi ho saka.");
      const uploaded = await uploadDirectlyToCloudinary(file, presignResult.data);
      const confirmResponse = await fetch("/api/admin/settings/upload-confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, serviceSlug, publicId: uploaded.public_id, resourceType: uploaded.resource_type, deliveryType: uploaded.type, format: uploaded.format }) });
      const confirmResult = await confirmResponse.json() as { error?: string; message?: string };
      if (!confirmResponse.ok) throw new Error(confirmResult.error ?? "Uploaded image save nahi ho saki.");
      await refresh();
      setMessage(confirmResult.message ?? "Service image updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload nahi ho saki.");
    } finally {
      setBusy(undefined);
    }
  }

  async function remove(serviceSlug: ServicePageSlug, kind: "hero" | "gallery", fileKey: string) {
    setBusy(fileKey);
    setError(undefined);
    try {
      const response = await fetch("/api/admin/settings/service-assets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceSlug, kind, fileKey }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Image remove nahi ho saki.");
      await refresh();
      setMessage("Service image removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Image remove nahi ho saki.");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="rounded-lg border border-[#E0E8E2] bg-white p-6">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#FFF0E7] text-[#E95D2B]"><ImageIcon size={19} /></span><div><p className="text-xs font-bold tracking-[.1em] text-[#E95D2B]">SERVICE MEDIA LIBRARY</p><h2 className="text-lg font-black">Hero photos &amp; work galleries</h2></div></div>
      <p className="mt-3 text-sm leading-6 text-[#71837A]">Har service ka main photo aur completed-work gallery yahan se manage karein. JPG, PNG ya WebP image, maximum 5MB.</p>
      {message && <p className="mt-5 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]">{message}</p>}
      {error && <p role="alert" className="mt-5 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]">{error} {!assets && <button type="button" onClick={() => { setError(undefined); void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Service images load nahi ho sake.")); }} className="ml-2 underline">Retry</button>}</p>}
      {!assets ? !error && <p role="status" className="mt-6 text-sm font-semibold text-[#71837A]">Loading service media...</p> : <div className="mt-6 grid gap-6">{SERVICE_PAGE_SLUGS.map((slug) => {
        const service = SERVICE_PAGES[slug];
        const asset = assets[slug];
        const heroInput = `${slug}:hero`;
        const galleryInput = `${slug}:gallery`;
        return <article key={slug} className="rounded-xl border border-[#DFE8E2] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[.1em] text-[#157A4A]">{service.eyebrow}</p><h3 className="mt-1 text-xl font-black">{service.shortTitle}</h3></div><a href={`/services/${slug}`} target="_blank" rel="noreferrer" className="text-xs font-black text-[#C9471E]">View public page</a></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="text-sm font-black">Hero image</p>
              <div className="mt-2 grid h-40 place-items-center overflow-hidden rounded-lg bg-[#F3F7F4]">{asset.hero ? <div className="group relative h-full w-full">
                <Image src={asset.hero.url} alt={`${service.shortTitle} hero preview`} fill sizes="260px" unoptimized className="object-cover" />
                <button type="button" disabled={busy === asset.hero.key} onClick={() => remove(slug, "hero", asset.hero!.key)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"><Trash2 size={14} /></button>
              </div> : <span className="px-4 text-center text-xs text-[#8A9991]">Default representative photo active</span>}</div>
              <input ref={(element) => { inputs.current[heroInput] = element; }} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => upload(slug, "SERVICE_HERO", event)} />
              <button type="button" disabled={busy === `${slug}:SERVICE_HERO`} onClick={() => inputs.current[heroInput]?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E95D2B] px-3 py-2 text-xs font-black text-[#C9471E] disabled:opacity-60"><UploadCloud size={14} />{asset.hero ? "Replace hero" : "Upload hero"}</button>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Old-work gallery</p><p className="mt-1 text-xs text-[#71837A]">{asset.gallery.length}/12 images</p></div><input ref={(element) => { inputs.current[galleryInput] = element; }} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => upload(slug, "SERVICE_GALLERY", event)} /><button type="button" disabled={asset.gallery.length >= 12 || busy === `${slug}:SERVICE_GALLERY`} onClick={() => inputs.current[galleryInput]?.click()} className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Plus size={14} /> Add photo</button></div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{asset.gallery.map((image) => <div key={image.key} className="group relative h-28 overflow-hidden rounded-lg bg-[#F3F7F4]">
                <Image src={image.url} alt={`${service.shortTitle} gallery preview`} fill sizes="180px" unoptimized className="object-cover" />
                <button type="button" disabled={busy === image.key} onClick={() => remove(slug, "gallery", image.key)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white"><Trash2 size={13} /></button>
              </div>)}{asset.gallery.length === 0 && <div className="col-span-full grid h-28 place-items-center rounded-lg border border-dashed border-[#D5E1DA] text-center text-xs text-[#8A9991]">Default gallery active. Add verified work photos here.</div>}</div>
            </div>
          </div>
        </article>;
      })}</div>}
    </section>
  );
}
