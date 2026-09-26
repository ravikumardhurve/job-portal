import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, HeartHandshake, MapPin, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { LandingSearch } from "@/components/landing-search";
import { HeroServicesCarousel } from "@/components/hero-services-carousel";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";
import { CHHATTISGARH_SERVICE_CITIES, type ServicePageSlug } from "@/lib/service-pages";
import { resolveServiceImages } from "@/lib/site-images";
import { getSiteUrl } from "@/lib/seo";

const icons = {
  shield: "\u{1F6E1}\uFE0F",
  heart: "\u2764\uFE0F",
  broom: "\u{1F9F9}",
  briefcase: "\u{1F4BC}",
  bug: "\u{1F41E}",
  baby: "\u{1F476}",
};

const services = [
  { icon: ShieldCheck, number: "01", title: "Security Guard Services", text: "Reliable security personnel for homes, offices, shops, events and commercial facilities.", href: "/services/security-services", tone: "classic-service-big", visual: icons.shield },
  { icon: Sparkles, number: "02", title: "Pest Control", text: "Professional solutions for residential and commercial spaces.", href: "/services/pest-control", tone: "classic-service-pest", visual: icons.bug },
  { icon: HeartHandshake, number: "03", title: "Baby Care & Caretaker", text: "Trusted support for babies, elderly people and patients.", href: "/services/baby-care", tone: "classic-service-care", visual: icons.baby },
  { icon: UsersRound, number: "04", title: "Housekeeping", text: "Cleaning and housekeeping staff for homes and workplaces.", href: "/services/housekeeping", tone: "classic-service-house", visual: icons.broom },
  { icon: BriefcaseBusiness, number: "05", title: "Find Jobs", text: "Search new opportunities matching your skills.", href: "/jobs", tone: "classic-service-jobs", visual: icons.briefcase },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = settings.metaTitle || `${settings.companyName} | Jobs & Facility Services`;
  return {
    title,
    description: settings.metaDescription,
    alternates: { canonical: "/" },
    openGraph: { title, description: settings.metaDescription, url: "/", type: "website", locale: "en_IN", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${settings.companyName} jobs and local services` }] },
    twitter: { card: "summary_large_image", title, description: settings.metaDescription, images: ["/twitter-image"] },
  };
}

export default async function Home() {
  const [landing, categories, settings] = await Promise.all([portalStore.getPublicLanding(), portalStore.listJobCategoryCounts(), portalStore.getSiteSettings()]);
  const logoUrl = settings.logoKey ? await createPublicDisplayUrl(settings.logoKey).catch(() => null) : null;
  const heroServices = await Promise.all(services.map(async (service) => {
    const slug = (service.href === "/jobs" ? "job-placement" : service.href.split("/").pop()) as ServicePageSlug;
    const { heroImage } = await resolveServiceImages(settings, slug);
    return { title: service.title, description: service.text, href: service.href, image: heroImage, visual: service.visual };
  }));
  const stats = [
    { value: landing.stats.activeJobs, label: "Active jobs" },
    { value: landing.stats.candidateCount, label: "Registered candidates" },
    { value: landing.stats.employerCount, label: "Hiring requirements" },
    { value: landing.stats.serviceClientCount, label: "Service requests" },
  ];
  const baseUrl = getSiteUrl();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: settings.companyName,
    url: baseUrl,
    description: settings.metaDescription,
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...((settings.address || settings.city || settings.state) ? { address: { "@type": "PostalAddress", ...(settings.address ? { streetAddress: settings.address } : {}), ...(settings.city ? { addressLocality: settings.city } : {}), ...(settings.state ? { addressRegion: settings.state } : {}), addressCountry: "IN" } } : {}),
    ...((settings.facebookUrl || settings.instagramUrl || settings.googleBusinessProfileUrl) ? { sameAs: [settings.facebookUrl, settings.instagramUrl, settings.googleBusinessProfileUrl].filter(Boolean) } : {}),
    areaServed: CHHATTISGARH_SERVICE_CITIES.map((city) => ({ "@type": "City", name: `${city}, Chhattisgarh` })),
    knowsAbout: ["Job placement", "Manpower recruitment", "Security guards", "Baby care", "Caretakers", "Housekeeping", "Pest control"],
  };

  return (
    <main className="classic-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <header id="home" className="classic-hero">
        <div className="classic-hero-orb classic-hero-orb-one" /><div className="classic-hero-orb classic-hero-orb-two" />
        <div className="classic-container classic-hero-grid">
          <div className="classic-hero-copy">
            <div className="classic-hero-tag"><span><BadgeCheck size={14} /></span>{settings.homeHeroBadge || "Jobs & trusted services in one place"}</div>
            <h1>{settings.homeHeroTitle || "Find work."}<br /><span className="classic-blue">{settings.homeHeroHighlight || "Find trusted"}</span><br /><span className="classic-orange">people.</span></h1>
            <p className="classic-hero-description">{settings.homeHeroDescription || "From finding your next job to hiring reliable professionals for your home and business — everything you need is now in one place."}</p>
            <div className="classic-actions"><Link href="/jobs" className="classic-button classic-button-blue">Find a Job <ArrowRight size={17} /></Link><Link href="#services" className="classic-button classic-button-light">Explore Services</Link></div>
            <div className="classic-mini-trust"><div className="classic-avatars"><span>{String.fromCodePoint(0x1f468)}</span><span>{String.fromCodePoint(0x1f469)}</span><span>{String.fromCodePoint(0x1f468, 0x200d, 0x1f4bc)}</span><span>{String.fromCodePoint(0x1f469, 0x200d, 0x1f4bc)}</span></div><div><strong>Trusted by growing communities</strong><small>Jobs &middot; Home &middot; Business &middot; Care</small></div></div>
          </div>

          <HeroServicesCarousel services={heroServices} />
        </div>
      </header>

      <section className="classic-quick-find"><div className="classic-container"><LandingSearch categories={categories.map((item) => item.category)} /></div></section>

      <section id="services" className="classic-section classic-services"><div className="classic-container"><div className="classic-heading-row"><div><p className="classic-eyebrow">WHAT WE DO</p><h2>{settings.homeServicesTitle || "One platform. Many everyday needs."}</h2></div><p>{settings.homeServicesDescription || "Whether you need a job, a security guard, professional cleaning, pest control or someone you can trust to care for your family — start here."}</p></div><div className="classic-service-grid">{services.map((service) => { const Icon = service.icon; return <Link key={service.title} href={service.href} className={`classic-service-card ${service.tone}`}><span className="classic-service-number">{service.number}</span><div className="classic-service-content"><Icon size={22} /><h3>{service.title}</h3><p>{service.text}</p><span className="classic-service-arrow"><ArrowRight size={18} /></span></div>{service.tone === "classic-service-big" && <div className="classic-service-art"><span>{service.visual}</span></div>}{service.tone !== "classic-service-big" && <span className="classic-service-emoji">{service.visual}</span>}</Link>; })}</div></div></section>

      <section className="classic-stats"><div className="classic-container classic-stats-grid">{stats.map((stat) => <div key={stat.label}><strong>{stat.value.toLocaleString("en-IN")}</strong><span>{stat.label}</span></div>)}</div></section>

      <section className="classic-trust-strip"><div className="classic-container classic-trust-grid">{[[String.fromCodePoint(0x2713), "Verified Staff", "Trusted professionals"], [String.fromCodePoint(0x26a1), "Quick Response", "Simple booking process"], [String.fromCodePoint(0x1f512), "Safe & Reliable", "Your trust matters"], [String.fromCodePoint(0x260e), "Customer Support", "We're here to help"]].map(([icon, title, text]) => <div key={title} className="classic-trust-item"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></div>)}</div></section>

      <section id="jobs" className="classic-section classic-jobs"><div className="classic-container classic-jobs-layout"><div className="classic-jobs-left"><p className="classic-eyebrow">CAREER OPPORTUNITIES</p><h2>Looking for<br />your next job?</h2><p>{settings.homeJobsDescription || "Browse opportunities across security, housekeeping, care and facility services. Apply directly through our platform."}</p><Link href="/jobs" className="classic-button classic-button-orange">Browse All Jobs <ArrowRight size={17} /></Link><div className="classic-job-count"><div><strong>{landing.stats.activeJobs.toLocaleString("en-IN")}</strong><span>Job openings</span></div><div><strong>{categories.length || "20+"}</strong><span>Job categories</span></div></div></div><div className="classic-job-list">{landing.jobs.length > 0 ? landing.jobs.map((job) => <article key={job.id} className="classic-job-card"><span className="classic-job-icon">{job.category.toLowerCase().includes("security") ? icons.shield : job.category.toLowerCase().includes("care") ? icons.heart : job.category.toLowerCase().includes("house") ? icons.broom : icons.briefcase}</span><div className="classic-job-content"><div><h3>{job.title}</h3>{job.urgent && <span>NEW</span>}</div><p><MapPin size={13} /> {job.city} <b>&middot;</b> {job.employmentType.replace("_", " ")} <b>&middot;</b> Rs. {job.salaryMin.toLocaleString("en-IN")} - Rs. {job.salaryMax.toLocaleString("en-IN")}</p></div><Link href={`/jobs/${job.id}`} className="classic-job-apply">View <ArrowRight size={14} /></Link></article>) : <div className="classic-empty">New job opportunities will appear here shortly. Candidate profile ready rakhein.</div>}</div></div></section>

      <section id="process" className="classic-section classic-process"><div className="classic-container"><div className="classic-process-header"><p className="classic-eyebrow">SIMPLE &amp; EASY</p><h2>From requirement to solution.</h2><p>No complicated process. Tell us what you need and we&apos;ll help you take the next step.</p></div><div className="classic-process-grid">{[["01", "Choose", "Select whether you're looking for a job or professional service."], ["02", "Tell us your need", "Share your location, requirement and preferred time."], ["03", "Get matched", "Find the appropriate job opportunity or service professional."], ["04", "You're ready", "Apply for the job or confirm your service booking."]].map(([number, title, text], index) => <article key={number} className={index === 3 ? "classic-process-card classic-process-last" : "classic-process-card"}><strong>{number}</strong><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

      <section id="contact" className="classic-cta"><div className="classic-container"><div className="classic-cta-box"><div><p className="classic-eyebrow classic-eyebrow-light">READY TO START?</p><h2>{settings.homeCtaTitle || "Need someone you can trust?"}</h2><p>{settings.homeCtaDescription || "Tell us what service you need. Our platform helps connect you with the right professional for your requirement."}</p><div className="classic-actions"><Link href="/services/request" className="classic-button classic-button-white">Book a Service <ArrowRight size={17} /></Link><Link href="/candidate/register" className="classic-button classic-button-orange">Find a Job</Link></div></div></div></div></section>

      <footer className="classic-footer"><div className="classic-container classic-footer-grid"><div><div className="classic-footer-brand">{logoUrl ? <Image src={logoUrl} alt={`${settings.companyName} logo`} width={44} height={44} unoptimized className="classic-footer-logo" /> : <span className="classic-footer-mark">CG</span>}<span><strong>{settings.companyName}</strong><small>{settings.tagline || "FACILITY SERVICES"}</small></span></div><p>{settings.companyName} - {settings.tagline || "Jobs, Security, Care & Facility"}. A simpler way to find opportunities and reliable everyday services.</p></div><div><strong>Services</strong><Link href="/services/security-services">Security Guard</Link><Link href="/services/pest-control">Pest Control</Link><Link href="/services/baby-care">Baby Care</Link><Link href="/services/housekeeping">Housekeeping</Link></div><div><strong>Quick Links</strong><Link href="/jobs">Find Jobs</Link><Link href="#process">How it Works</Link><Link href="/about">About Us</Link><Link href="#contact">Contact</Link></div><div><strong>Contact</strong><p className="classic-footer-contact">{settings.address || ([settings.city, settings.state].filter(Boolean).join(", ") || "Chhattisgarh, India")}{settings.workingHours && <><br />{settings.workingHours}</>}{settings.phone && <><br /><a href={`tel:${settings.phone}`}>{settings.phone}</a></>}{settings.email && <><br /><a href={`mailto:${settings.email}`}>{settings.email}</a></>}</p></div></div><div className="classic-footer-bottom"><span>&copy; {new Date().getFullYear()} {settings.companyName}</span><span><Link href="/privacy">Privacy Policy</Link> &middot; <Link href="/terms">Terms &amp; Conditions</Link></span></div></footer>
    </main>
  );
}
