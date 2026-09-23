import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Building2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SERVICE_PAGES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { portalStore } from "@/lib/portal";
import { resolveServiceImages } from "@/lib/site-images";

export const metadata: Metadata = {
  title: "Security, Baby Care, Housekeeping & Pest Control Raipur | CG Job Care",
  description: "Explore security guards, baby care, caretakers, housekeeping and pest control services in Raipur and major cities across Chhattisgarh.",
  keywords: ["security guard Raipur", "baby care Raipur", "caretaker Raipur", "housekeeping Raipur", "pest control Raipur", "facility services Chhattisgarh"],
  alternates: { canonical: "/services" },
  openGraph: { title: "Local Services in Raipur & Chhattisgarh | CG Job Care", description: "Request security, care, housekeeping and pest control support.", url: "/services", type: "website", locale: "en_IN" },
};

export default async function ServicesPage() {
  const settings = await portalStore.getSiteSettings();
  const images = Object.fromEntries(await Promise.all(SERVICE_PAGE_SLUGS.map(async (slug) => [slug, (await resolveServiceImages(settings, slug)).heroImage])));
  return (
    <main className="min-h-screen bg-[#F5FAF7] text-[#1E2B26]">
      <SiteHeader />
      <section className="bg-[#EEF5F0]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_.75fr] lg:items-end lg:py-16">
          <div><p className="section-kicker text-[#0F5C38]">ALL SERVICES</p><h1 className="section-title">Har requirement ke liye dedicated page.</h1><p className="mt-5 max-w-2xl leading-7 text-[#4B5A52]">Jobs, security, home care, housekeeping aur pest control ka scope, process, gallery aur reviews ek jagah dekhein.</p></div>
          <div className="rounded-xl bg-[#1E2B26] p-6 text-white shadow-[0_18px_40px_rgba(36,26,20,0.16)]"><Building2 size={22} className="text-[#D4B04A]" /><p className="mt-4 text-lg font-black">Recurring manpower chahiye?</p><p className="mt-2 text-sm leading-6 text-[#D5E3DB]">Requirement private rehti hai aur relevant operational team ko assign hoti hai.</p></div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 lg:py-16">
        <div className="grid gap-5 md:grid-cols-2">{SERVICE_PAGE_SLUGS.map((slug) => {
          const service = SERVICE_PAGES[slug];
          return <article key={slug} className="group overflow-hidden rounded-xl border border-[#DCE8E1] bg-white transition hover:-translate-y-1 hover:shadow-xl">
            <div className="relative h-52 overflow-hidden">
              <Image src={images[slug]} alt={`${service.shortTitle} service in Chhattisgarh`} fill sizes="(max-width: 768px) 100vw, 50vw" unoptimized={images[slug].startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black tracking-[.12em] text-[#0F5C38] backdrop-blur">{service.eyebrow}</span>
            </div>
            <div className="p-6"><h2 className="text-2xl font-black">{service.shortTitle}</h2><p className="mt-3 text-sm leading-6 text-[#4B5A52]">{service.summary}</p><div className="mt-5 flex flex-wrap gap-2">{service.included.map((item) => <span key={item.title} className="rounded-full bg-[#EEF5F0] px-3 py-1.5 text-xs font-bold text-[#4B5A52]">{item.title}</span>)}</div><Link href={`/services/${slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">View dedicated page <ArrowRight size={16} /></Link></div>
          </article>;
        })}</div>
        <div className="mt-10 rounded-xl border border-[#DCE8E1] bg-white p-6 sm:flex sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Already know what you need?</h2><p className="mt-2 text-sm text-[#5C6B63]">Location, service type aur staffing requirement simple form mein share karein.</p></div><Link href="/services/request" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-4 py-3 text-sm font-bold text-white sm:mt-0">Start service request <ArrowRight size={16} /></Link></div>
      </section>
    </main>
  );
}
