import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CHHATTISGARH_SERVICE_CITIES, SERVICE_PAGES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Jobs & Services Across Chhattisgarh | CG Job Care",
  description: "Explore jobs, security guards, baby care, caretakers, housekeeping and pest control requests in Raipur and major Chhattisgarh cities.",
  keywords: ["jobs in Chhattisgarh", "services in Raipur", "security guard Chhattisgarh", "pest control Chhattisgarh", "caretaker Raipur", "housekeeping Chhattisgarh"],
  alternates: { canonical: "/locations" },
  openGraph: { title: "Jobs & Services Across Chhattisgarh | CG Job Care", description: "Local job opportunities and service request support across major cities in Chhattisgarh.", url: "/locations", type: "website", locale: "en_IN" },
};

const cityDetails: Record<(typeof CHHATTISGARH_SERVICE_CITIES)[number], string> = {
  Raipur: "Jobs, recruitment, security guards, baby care, caretakers, housekeeping and pest control requirements in the state capital region.",
  Bhilai: "Job and facility service enquiries for residential areas, offices, shops and the Bhilai industrial area.",
  Durg: "Candidate opportunities and household or commercial service requests across Durg and nearby localities.",
  Bilaspur: "Local job discovery, staffing requirements and facility service enquiries for homes and businesses in Bilaspur.",
  Korba: "Manpower, security, housekeeping, home-care and pest management requests for Korba customers and employers.",
  Rajnandgaon: "Job applications and service enquiries for families, commercial properties and employers in Rajnandgaon.",
  Raigarh: "Recruitment and facility support enquiries for Raigarh homes, offices, shops and work sites.",
  Ambikapur: "Candidate registration and home or business service requests from Ambikapur and nearby areas.",
  Jagdalpur: "Job seekers, employers and customers in Jagdalpur can share requirements for review and availability confirmation.",
  Dhamtari: "Local recruitment, caretaker, housekeeping, security and pest control enquiries for Dhamtari customers.",
};

export default function LocationsPage() {
  const baseUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CG Job Care service areas in Chhattisgarh",
    url: `${baseUrl}/locations`,
    description: "Jobs and service request coverage information for major cities across Chhattisgarh.",
    mainEntity: { "@type": "ItemList", itemListElement: CHHATTISGARH_SERVICE_CITIES.map((city, index) => ({ "@type": "ListItem", position: index + 1, name: `${city}, Chhattisgarh` })) },
  };
  return (
    <main className="min-h-screen bg-[#F8FBF9] text-[#1E2B26]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <section className="border-b border-[#DCE8E1] bg-[#0E3D31] text-white"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><p className="text-xs font-black tracking-[.14em] text-[#FFE093]">CHHATTISGARH COVERAGE</p><h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Jobs and trusted service requests across major cities.</h1><p className="mt-5 max-w-3xl text-base leading-8 text-[#D7E7E0]">CG Job Care candidates, employers, families aur businesses ko Raipur aur Chhattisgarh ke major cities mein job discovery, manpower aur facility-service enquiry process se connect karta hai.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/jobs" className="inline-flex items-center gap-2 rounded-lg bg-[#F4C95D] px-5 py-3 text-sm font-black text-[#18382F]">Find jobs <ArrowRight size={16} /></Link><Link href="/services" className="rounded-lg border border-white/35 px-5 py-3 text-sm font-black">Explore services</Link></div></div></section>
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="section-kicker text-[#157A4A]">AREAS WE SERVE</p><h2 className="section-title">Major cities in Chhattisgarh</h2><p className="mt-4 leading-7 text-[#5C6B63]">Har city mein live job aur staff availability alag ho sakti hai. Request submit hone ke baad local availability, schedule aur next step confirm kiya jaata hai.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{CHHATTISGARH_SERVICE_CITIES.map((city) => <article key={city} className="rounded-xl border border-[#DCE8E1] bg-white p-6"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#E8F5ED] text-[#157A4A]"><MapPin size={20} /></span><h2 className="mt-5 text-xl font-black">Jobs and services in {city}</h2><p className="mt-3 text-sm leading-6 text-[#5C6B63]">{cityDetails[city]}</p><div className="mt-5 flex gap-4"><Link href={`/jobs?city=${encodeURIComponent(city)}`} className="text-xs font-black text-[#0F5C38]">Jobs in {city}</Link><Link href="/services/request" className="text-xs font-black text-[#0F5C38]">Request service</Link></div></article>)}</div></section>
      <section className="border-y border-[#DCE8E1] bg-white"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="section-kicker text-[#157A4A]">SERVICES AVAILABLE FOR REQUEST</p><h2 className="section-title">Choose the support you need.</h2></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">{SERVICE_PAGE_SLUGS.map((slug) => { const service = SERVICE_PAGES[slug]; return <Link key={slug} href={`/services/${slug}`} className="group rounded-xl border border-[#DCE8E1] bg-[#F8FBF9] p-5 hover:border-[#157A4A]"><CheckCircle2 size={19} className="text-[#157A4A]" /><h3 className="mt-4 font-black">{service.shortTitle}</h3><p className="mt-2 text-xs leading-5 text-[#5C6B63]">{service.summary}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#0F5C38]">View details <ArrowRight size={13} /></span></Link>; })}</div></div></section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8"><div><BriefcaseBusiness className="text-[#157A4A]" /><h2 className="mt-4 text-3xl font-black">Looking for work anywhere in Chhattisgarh?</h2><p className="mt-3 max-w-2xl leading-7 text-[#5C6B63]">Candidate account banakar profile complete karein, city aur job preference set karein aur available vacancies par apply karein.</p></div><Link href="/candidate/register" className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white">Register as candidate <ArrowRight size={16} /></Link></section>
    </main>
  );
}
