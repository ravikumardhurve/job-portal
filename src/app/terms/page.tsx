import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";

export const metadata: Metadata = { title: "Terms and Conditions | CG Job Care", description: "Terms for using CG Job Care recruitment and facility-service platform.", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const settings = await portalStore.getSiteSettings();
  return <main className="min-h-screen bg-[#F5FAF7] text-[#1E2B26]"><SiteHeader /><article className="mx-auto max-w-4xl px-5 py-12"><p className="section-kicker text-[#157A4A]">PLATFORM TERMS</p><h1 className="mt-2 text-4xl font-black">Terms and Conditions</h1><p className="mt-3 text-sm text-[#6B7A72]">Effective and last updated: 21 September 2026</p><div className="mt-8 grid gap-5">
    <Term title="1. Platform purpose">{settings.companyName} helps candidates discover opportunities and enables employers and customers to submit recruitment or facility-service requirements. The platform coordinates information and workflows; it does not guarantee selection, employment, staff availability or a specific service outcome.</Term>
    <Term title="2. Candidate accounts">Candidates must be at least 18 years old and provide accurate, current information. Account credentials must be kept confidential. Impersonation, forged documents, duplicate accounts and unauthorized use are prohibited.</Term>
    <Term title="3. Jobs and applications">Job information may be supplied by employers or administrators and can change or close. Candidates should independently confirm role, salary, location, duties and employer details before joining. Applying does not guarantee an interview or placement.</Term>
    <Term title="4. Documents">Candidates may upload only documents they are authorized to use. Documents must be accurate and free from harmful content. Uploaded identity and qualification documents are handled according to the <Link href="/privacy" className="font-bold text-[#0F5C38] underline">Privacy Policy</Link>.</Term>
    <Term title="5. Fair use">Users must not attack the platform, scrape private data, bypass access controls, upload malware, submit unlawful content or misuse another person’s information. Accounts may be blocked where fraud, safety or misuse is suspected.</Term>
    <Term title="6. Fees and third parties">Any recruitment or service fee must be clearly communicated separately. External employers, service partners, communication providers and hosting services may have their own terms. Never make an unverified payment based only on an online message.</Term>
    <Term title="7. Availability and changes">We may update, suspend or discontinue features for maintenance, security or business requirements. We aim to keep information available but do not promise uninterrupted service.</Term>
    <Term title="8. Contact and complaints">Questions, corrections or complaints can be submitted through our <Link href="/contact" className="font-bold text-[#0F5C38] underline">contact page</Link>{settings.email ? <> or emailed to <a href={`mailto:${settings.email}`} className="font-bold text-[#0F5C38] underline">{settings.email}</a></> : null}{settings.address ? <>. Written correspondence may be addressed to {settings.address}</> : null}.</Term>
  </div><div className="mt-8 flex flex-wrap gap-4 text-sm font-bold"><Link href="/privacy" className="text-[#0F5C38] underline">Privacy Policy</Link><Link href="/" className="text-[#0F5C38] underline">Back to home</Link></div></article></main>;
}

function Term({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-[#DCE8E1] bg-white p-6"><h2 className="text-lg font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-[#4B5A52]">{children}</p></section>; }
