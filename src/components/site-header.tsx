import Link from "next/link";
import Image from "next/image";
import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";
import { SiteHeaderNav } from "@/components/site-header-nav";

const navLinks = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const [session, settings] = await Promise.all([getCandidateSession(), portalStore.getSiteSettings()]);
  const candidate = session ? await portalStore.getCandidateById(session.candidateId) : null;
  const logoUrl = settings.logoKey ? await createPublicDisplayUrl(settings.logoKey).catch(() => null) : null;
  return (
    <header className="sticky top-0 z-30 border-b border-[#DCE8E1] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-5 px-5 lg:h-[74px] lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={`${settings.companyName} home`}>
          {logoUrl ? (
            <Image src={logoUrl} alt={`${settings.companyName} logo`} width={40} height={40} unoptimized className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <Image src="/brand/cg-job-care-logo.svg" alt="CG Job Care" width={164} height={40} priority className="h-10 w-auto" />
          )}
          {logoUrl && <span className="leading-tight"><strong className="block text-[15px] text-[#1E2B26]">{settings.companyName}</strong>{settings.tagline && <small className="text-[11px] text-[#5C6B63]">{settings.tagline}</small>}</span>}
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm font-semibold text-[#4B5A52] lg:flex">
          {navLinks.map((link) => <Link key={link.href} className="hover:text-[#157A4A]" href={link.href}>{link.label}</Link>)}
        </nav>
        <SiteHeaderNav candidate={candidate ? { fullName: candidate.fullName } : null} phone={settings.phone} />
      </div>
    </header>
  );
}
