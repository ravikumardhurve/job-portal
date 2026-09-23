import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Contact CG Job Care Raipur | Jobs & Service Enquiries",
  description: "Contact CG Job Care in Raipur for jobs, manpower, security guards, baby care, caretakers, housekeeping and pest control enquiries.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await portalStore.getSiteSettings();
  const contacts = [
    ...(settings.phone ? [{ icon: Phone, title: "Call our team", detail: settings.phone, note: settings.workingHours ?? "", href: `tel:${settings.phone}` }] : []),
    ...(settings.whatsapp ? [{ icon: MessageCircle, title: "WhatsApp support", detail: `Chat with ${settings.companyName}`, note: "Quick help for jobs and services", href: `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}` }] : []),
    ...(settings.email ? [{ icon: Mail, title: "Email us", detail: settings.email, note: "For detailed queries", href: `mailto:${settings.email}` }] : []),
    ...(settings.googleBusinessProfileUrl ? [{ icon: MapPin, title: "Google Business Profile", detail: "View our Google profile", note: "Location, hours and updates", href: settings.googleBusinessProfileUrl }] : []),
  ];
  const location = settings.address || [settings.city, settings.state].filter(Boolean).join(", ");

  return <main className="min-h-screen bg-[#F5FAF7] text-[#1E2B26]"><SiteHeader /><section className="border-b border-[#DCE8E1] bg-[#EEF5F0]"><div className="mx-auto max-w-6xl px-5 py-8 lg:py-14 lg:px-8"><p className="section-kicker text-[#0F5C38]">SPEAK WITH OUR TEAM</p><h1 className="section-title">We&apos;re here when you need support.</h1><p className="mt-4 max-w-2xl leading-7 text-[#4B5A52]">Whether you are searching for a job, need manpower or want to request a facility service, start with a quick conversation.</p></div></section><section className="mx-auto max-w-6xl px-5 py-12 lg:px-8">{contacts.length > 0 ? <div className="grid gap-4 md:grid-cols-3">{contacts.map((contact) => { const Icon = contact.icon; return <a key={contact.title} href={contact.href} className="group rounded-lg border border-[#DCE8E1] bg-white p-6 transition hover:-translate-y-1 hover:border-[#B9D6C6] hover:shadow-lg"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#E9F3ED] text-[#157A4A]"><Icon size={21} /></span><h2 className="mt-6 font-extrabold">{contact.title}</h2><p className="mt-2 text-sm font-bold text-[#0F5C38]">{contact.detail}</p><p className="mt-2 text-sm text-[#4B5A52]">{contact.note}</p></a>; })}</div> : <div className="rounded-xl border border-dashed border-[#CCDAD2] bg-white p-7"><h2 className="text-lg font-black">Direct contact details are being updated.</h2><p className="mt-2 text-sm leading-6 text-[#5C6B63]">You can still submit a staffing or service requirement through the secure forms below.</p></div>}<div className="mt-10 grid gap-6 rounded-lg bg-[#1E2B26] p-7 text-white lg:grid-cols-[1fr_auto] lg:items-center"><div>{location && <div className="flex items-center gap-2 text-[#D4B04A]"><MapPin size={19} /><span className="text-sm font-bold">{location.toUpperCase()}</span></div>}<h2 className="mt-5 text-2xl font-black">Want to share a requirement instead?</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#D5E3DB]">For staffing or facility needs, send the relevant details directly to our operational team.</p>{settings.workingHours && <p className="mt-5 inline-flex items-center gap-2 text-sm text-[#D4B04A]"><Clock3 size={16} /> {settings.workingHours}</p>}</div><div className="flex flex-wrap gap-3"><Link href="/employer/requirement" className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-4 py-3 text-sm font-bold">Hire staff <ArrowRight size={16} /></Link><Link href="/services/request" className="rounded-lg border border-[#5C6B63] px-4 py-3 text-sm font-bold">Request service</Link></div></div></section></main>;
}
