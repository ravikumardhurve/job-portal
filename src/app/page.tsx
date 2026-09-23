import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  PhoneCall,
  Quote,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { LandingSearch } from "@/components/landing-search";
import { SiteHeader } from "@/components/site-header";
import { HeroBannerCarousel } from "@/components/hero-banner-carousel";
import { HeroJobsCarousel } from "@/components/hero-jobs-carousel";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";
import { getCategoryImage, SERVICE_IMAGES } from "@/lib/constants";
import { CHHATTISGARH_SERVICE_CITIES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { getSiteUrl } from "@/lib/seo";
import { resolveServiceImages } from "@/lib/site-images";

export const metadata: Metadata = {
  title: "Jobs & Local Services in Raipur, Chhattisgarh | CG Job Care",
  description: "Find jobs and request security guards, baby care, caretakers, housekeeping and pest control services in Raipur and across Chhattisgarh.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Jobs & Local Services in Raipur | CG Job Care",
    description: "Jobs, manpower and trusted facility-service requests across Chhattisgarh.",
    url: "/",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CG Job Care jobs and local services in Chhattisgarh" }],
  },
  twitter: { card: "summary_large_image", title: "Jobs & Local Services in Raipur | CG Job Care", description: "Jobs, manpower and facility services across Chhattisgarh.", images: ["/twitter-image"] },
};

const services = [
  { icon: BriefcaseBusiness, eyebrow: "JOBS & RECRUITMENT", title: "Job Placement", text: "Local vacancies, profile support aur joining guidance ek simple process ke saath.", points: ["Published vacancies", "Application tracking"], href: "/services/job-placement", image: SERVICE_IMAGES.jobPlacement, tone: "service-card-green" },
  { icon: ShieldCheck, eyebrow: "SECURITY", title: "Security Services", text: "Homes, offices, sites aur events ke liye guards, lady guards aur supervisors.", points: ["Site-ready staff", "Flexible requirements"], href: "/services/security-services", image: SERVICE_IMAGES.security, tone: "service-card-blue" },
  { icon: HeartHandshake, eyebrow: "HOME CARE", title: "Baby & Caretaker", text: "Baby care, elder care aur patient support ke liye responsible caregivers.", points: ["Home-based support", "Requirement review"], href: "/services/baby-care", image: SERVICE_IMAGES.care, tone: "service-card-purple" },
  { icon: UsersRound, eyebrow: "FACILITY STAFF", title: "Housekeeping", text: "Homes, offices, hotels aur commercial properties ke liye reliable cleaning staff.", points: ["Individual or team", "Home & business"], href: "/services/housekeeping", image: SERVICE_IMAGES.housekeeping, tone: "service-card-yellow" },
  { icon: Sparkles, eyebrow: "PEST MANAGEMENT", title: "Pest Control", text: "Residential aur commercial spaces ke liye practical pest treatment coordination.", points: ["Home & office", "Local coordination"], href: "/services/pest-control", image: SERVICE_IMAGES.pestControl, tone: "service-card-orange" },
];

const journeys = [
  { icon: BriefcaseBusiness, label: "JOB SEEKER", title: "Mujhe job chahiye", text: "Profile banayein, nearby jobs dekhein aur application status track karein.", href: "/candidate/register", action: "Find a job", tone: "journey-green" },
  { icon: Building2, label: "EMPLOYER", title: "Mujhe staff chahiye", text: "Apni vacancy ya manpower requirement private form se share karein.", href: "/employer/requirement", action: "Hire staff", tone: "journey-blue" },
  { icon: HeartHandshake, label: "CUSTOMER", title: "Mujhe service chahiye", text: "Security, care, housekeeping ya pest control ke liye request bhejein.", href: "/services/request", action: "Request service", tone: "journey-orange" },
];

export default async function Home() {
  const [landing, categories, settings] = await Promise.all([portalStore.getPublicLanding(), portalStore.listJobCategoryCounts(), portalStore.getSiteSettings()]);
  const heroJobs = landing.jobs.map((job) => ({ id: job.id, title: job.title, city: job.city, vacancies: job.vacancies, salaryMin: job.salaryMin, salaryMax: job.salaryMax, image: getCategoryImage(job.category) }));
  const heroBannerUrls = (await Promise.all((settings.heroBannerKeys ?? []).map((key) => createPublicDisplayUrl(key).catch(() => null)))).filter((url): url is string => Boolean(url));
  const displayServices = await Promise.all(services.map(async (service, index) => ({ ...service, image: (await resolveServiceImages(settings, SERVICE_PAGE_SLUGS[index])).heroImage })));
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
    <main className="landing-page overflow-hidden bg-[#fffaf4] text-[#17251f]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <div className="landing-announcement px-5 py-2.5 text-center text-xs font-bold text-white sm:text-sm"><span>{landing.announcement?.title ?? settings.homeAnnouncementText}</span><Link href={landing.announcement?.link ?? "/jobs"} className="ml-2 font-black text-[#ffe3a0] underline underline-offset-4">View latest updates</Link></div>
      <SiteHeader />

      <section className="landing-hero relative">
        <div className="landing-hero-orb landing-hero-orb-one" /><div className="landing-hero-orb landing-hero-orb-two" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <p className="hero-location-badge inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black tracking-wide text-[#0b5a39]"><MapPin size={14} /> {settings.homeHeroBadge}</p>
            <h1 className="landing-hero-title mt-6 max-w-3xl text-[2.85rem] font-black leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[4.65rem]">{settings.homeHeroTitle} <span>{settings.homeHeroHighlight}</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#5d6d64] sm:text-lg sm:leading-8">{settings.homeHeroDescription}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/jobs" className="landing-button landing-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black text-white">Find your next job <ArrowRight size={17} /></Link><Link href="#choose" className="landing-button landing-button-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-black text-[#0b5a39]">Explore services <ArrowUpRight size={17} /></Link></div>
            <LandingSearch />
            {categories.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] font-black uppercase tracking-[.14em] text-[#718078]">Popular jobs</span>{categories.slice(0, 4).map((item) => <Link key={item.category} href={`/jobs?category=${encodeURIComponent(item.category)}`} className="rounded-full border border-[#d6e5d8] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#0b5a39] hover:bg-white">{item.category} · {item.count}</Link>)}</div>}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-[#53665b] sm:text-sm"><span className="inline-flex items-center gap-2"><BadgeCheck size={16} className="text-[#16915a]" /> Admin-reviewed listings</span><span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[#16915a]" /> Private requirements</span><span className="inline-flex items-center gap-2"><PhoneCall size={16} className="text-[#16915a]" /> Local support</span></div>
          </div>

          <div className="landing-hero-visual relative min-h-[430px] overflow-hidden rounded-[2rem] bg-[#0b3b29] shadow-[0_30px_80px_rgba(21,68,46,.22)] sm:min-h-[510px]">
            {heroBannerUrls.length > 0 ? <><HeroBannerCarousel images={heroBannerUrls} /><div className="landing-hero-image-shade absolute inset-0" /><div className="relative flex h-full min-h-[430px] flex-col justify-between p-6 text-white sm:min-h-[510px] sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-black tracking-[.16em] backdrop-blur">CG JOB CARE</span><span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffe092] text-[#0b3b29]"><BadgeCheck size={20} /></span></div><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#ffe092]">Aapki next opportunity</p><h2 className="mt-3 max-w-md text-3xl font-black leading-tight sm:text-4xl">Real opportunities. Reliable local support.</h2><p className="mt-4 max-w-md text-sm leading-6 text-[#e6f3eb]">Candidate, employer ya customer—har request sahi operational team tak pahunchti hai.</p><Link href="#choose" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#0b5a39]">Choose what you need <ArrowRight size={16} /></Link></div></div></> : heroJobs.length > 0 ? <HeroJobsCarousel jobs={heroJobs} /> : <><Image src={SERVICE_IMAGES.jobPlacement} alt="People discussing job opportunities" fill priority sizes="(max-width: 1024px) 100vw, 48vw" className="object-cover" /><div className="landing-hero-image-shade absolute inset-0" /><div className="relative flex h-full min-h-[430px] flex-col justify-end p-6 text-white sm:min-h-[510px] sm:p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-[#ffe092]">OPEN TODAY</p><h2 className="mt-3 text-3xl font-black leading-tight">Fresh opportunities in Chhattisgarh</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#e6f3eb]">Published jobs, recruitment and facility support from one local team.</p></div></>}
            <div className="hero-floating-proof absolute bottom-5 right-5 z-20 hidden items-center gap-3 rounded-2xl border border-white/25 bg-white/90 px-3 py-3 text-[#173d2b] shadow-xl backdrop-blur sm:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f5ec] text-[#12804f]"><ShieldCheck size={18} /></span><span><strong className="block text-xs font-black">Local & reliable</strong><small className="text-[10px] text-[#5d6d64]">Support across Chhattisgarh</small></span></div>
          </div>
        </div>
      </section>

      <section id="choose" className="relative z-10 mx-auto -mt-1 max-w-7xl px-5 pb-14 lg:-mt-10 lg:px-8"><div className="rounded-[1.6rem] border border-[#e8e1d7] bg-white p-5 shadow-[0_20px_60px_rgba(83,66,42,.1)] sm:p-7 lg:p-9"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="landing-kicker">START HERE</p><h2 className="landing-section-title mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Aap yahan kis liye aaye hain?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#66756c] sm:text-base">Apni need choose karein—hum aapko seedha sahi form aur process tak le jayenge.</p></div><Link href="/contact" className="inline-flex items-center gap-2 text-sm font-black text-[#0b5a39]">Need help? Talk to us <ArrowRight size={16} /></Link></div><div className="mt-7 grid gap-4 md:grid-cols-3">{journeys.map((journey) => { const Icon = journey.icon; return <Link key={journey.title} href={journey.href} className={`journey-card ${journey.tone} group relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-1 sm:p-6`}><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/85 shadow-sm"><Icon size={22} /></span><ArrowUpRight size={20} className="opacity-60 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></div><p className="mt-7 text-[10px] font-black tracking-[.16em] opacity-70">{journey.label}</p><h3 className="mt-2 text-xl font-black sm:text-2xl">{journey.title}</h3><p className="mt-3 max-w-sm text-sm leading-6 opacity-80">{journey.text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black">{journey.action} <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>; })}</div></div></section>

      <section aria-label="Platform statistics" className="landing-stats border-y border-[#e6e9e1] bg-[#f7fbf5]"><div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:grid-cols-4 lg:px-8">{stats.map((stat, index) => <div key={stat.label} className={`landing-stat relative px-3 py-6 text-center sm:py-8 ${index > 0 ? "before:absolute before:left-0 before:top-1/4 before:h-1/2 before:border-l before:border-[#dfe8df]" : ""}`}><p className="text-2xl font-black tracking-[-.04em] text-[#0b5a39] sm:text-3xl">{stat.value.toLocaleString("en-IN")}</p><p className="mt-1 text-[11px] font-bold text-[#687970] sm:text-sm">{stat.label}</p></div>)}</div></section>

      <section id="services" className="landing-services px-5 py-16 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="landing-kicker">SERVICES THAT FIT REAL LIFE</p><h2 className="landing-section-title mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Kaam bhi. Care bhi. Support bhi.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#66756c] sm:text-base">Ek local team, multiple practical solutions—clear information ke saath.</p></div><Link href="/services" className="inline-flex items-center gap-2 text-sm font-black text-[#0b5a39]">View all services <ArrowRight size={16} /></Link></div><div className="service-rail mt-8 flex snap-x gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">{displayServices.map((service) => { const Icon = service.icon; return <article key={service.title} className="service-card group min-w-[82vw] snap-start overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 md:min-w-0"><div className="relative h-44 overflow-hidden sm:h-48"><Image src={service.image} alt={`${service.title} in Chhattisgarh`} fill sizes="(max-width: 768px) 82vw, (max-width: 1280px) 33vw, 20vw" unoptimized={service.image.startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" /><span className={`service-icon ${service.tone} absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-xl shadow-lg`}><Icon size={19} /></span></div><div className="p-5"><p className="text-[10px] font-black tracking-[.15em] text-[#d45c2b]">{service.eyebrow}</p><h3 className="mt-2 text-xl font-black">{service.title}</h3><p className="mt-2 text-sm leading-6 text-[#66756c]">{service.text}</p><ul className="mt-4 grid gap-2 text-xs font-bold text-[#52635a]">{service.points.map((point) => <li key={point} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#168b56]" />{point}</li>)}</ul><Link href={service.href} className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-[#0b5a39]">Explore service <ArrowRight size={14} /></Link></div></article>; })}</div><p className="mt-1 text-center text-xs font-semibold text-[#88958d] md:hidden">Swipe to explore services →</p></div></section>

      <section id="jobs" className="landing-jobs px-5 py-16 text-white sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="landing-kicker landing-kicker-light">FRESH OPPORTUNITIES</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{settings.homeJobsTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#cbe0d3] sm:text-base">{settings.homeJobsDescription}</p></div><Link href="/jobs" className="inline-flex items-center gap-2 self-start rounded-xl border border-white/25 px-4 py-3 text-sm font-black hover:bg-white hover:text-[#0b3b29] sm:self-auto">Browse all jobs <ArrowRight size={16} /></Link></div><div className="mt-8 grid gap-4 lg:grid-cols-3">{landing.jobs.length > 0 ? landing.jobs.map((job) => <article key={job.id} className="job-card group rounded-2xl bg-white p-5 text-[#143c2a] shadow-xl transition hover:-translate-y-1 sm:p-6"><div className="flex items-center justify-between gap-3"><p className={`text-[10px] font-black tracking-[.15em] ${job.urgent ? "text-[#cf4c23]" : "text-[#13814e]"}`}>{job.urgent ? "URGENT HIRING" : "PUBLISHED JOB"}</p><span className="rounded-full bg-[#edf7ef] px-2.5 py-1 text-[10px] font-black text-[#597064]">{job.vacancies} openings</span></div><h3 className="mt-5 text-xl font-black sm:text-2xl">{job.title}</h3><p className="mt-2 text-sm text-[#65766c]">{job.company}</p><p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#65766c]"><MapPin size={15} className="text-[#168b56]" />{job.city}</p><div className="mt-6 flex items-end justify-between gap-3 border-t border-[#e3ebe4] pt-5"><div><p className="text-[11px] text-[#7b8a81]">Monthly salary</p><p className="mt-1 text-sm font-black">Rs. {job.salaryMin.toLocaleString("en-IN")} - Rs. {job.salaryMax.toLocaleString("en-IN")}</p></div><Link href={`/jobs/${job.id}`} className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f5ec] text-[#0b5a39]" aria-label={`View ${job.title}`}><ArrowRight size={17} /></Link></div></article>) : <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-sm text-[#d9ebe1] lg:col-span-3">New job opportunities will appear here shortly. Candidate profile ready rakhein.</div>}</div></div></section>

      <section className="border-b border-[#ece6dd] bg-white px-5 py-16 sm:py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="landing-kicker">LOCAL REACH</p><h2 className="landing-section-title mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Raipur se major cities tak support.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#66756c] sm:text-base">Jobs aur service enquiries Chhattisgarh ke major cities se accept ki jaati hain. Availability verification ke baad confirm hoti hai.</p></div><Link href="/locations" className="inline-flex items-center gap-2 text-sm font-black text-[#0b5a39]">View all locations <ArrowRight size={16} /></Link></div><div className="mt-7 flex flex-wrap gap-2">{CHHATTISGARH_SERVICE_CITIES.map((city) => <Link key={city} href={`/jobs?city=${encodeURIComponent(city)}`} className="location-chip rounded-full border px-4 py-2 text-sm font-bold">{city}</Link>)}</div></div></section>

      <section className="landing-process px-5 py-16 sm:py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-center"><div><p className="landing-kicker">SIMPLE & TRANSPARENT</p><h2 className="landing-section-title mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Request se response tak clear process.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[#66756c] sm:text-base">Aapko form bharne ke baad relevant team se coordinated updates milte hain—without unnecessary confusion.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/about" className="landing-button landing-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white">Know about us <ArrowRight size={16} /></Link>{settings.phone && <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-[#cdded1] px-5 py-3 text-sm font-black text-[#0b5a39]"><PhoneCall size={16} /> Call our team</a>}</div></div><ol className="grid gap-3 sm:grid-cols-2"><li className="process-card"><b>01</b><span><strong>Choose your need</strong><small>Job, hiring or facility service.</small></span></li><li className="process-card"><b>02</b><span><strong>Share basic details</strong><small>Simple mobile-friendly form.</small></span></li><li className="process-card"><b>03</b><span><strong>Team reviews request</strong><small>Correct department handles it.</small></span></li><li className="process-card"><b>04</b><span><strong>Get coordinated support</strong><small>Updates through the next steps.</small></span></li></ol></div></section>

      <section className="landing-cta mx-5 mb-16 overflow-hidden rounded-[1.6rem] sm:mx-auto sm:mb-20 sm:max-w-7xl"><div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14"><div className="landing-cta-shape" /><div className="relative"><p className="landing-kicker landing-kicker-light">READY TO START?</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-white sm:text-4xl">{settings.homeCtaTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d8eee0] sm:text-base">{settings.homeCtaDescription}</p></div><div className="relative flex flex-wrap gap-3"><Link href="/candidate/register" className="rounded-xl bg-[#ffe092] px-4 py-3 text-sm font-black text-[#173b29]">Register for jobs</Link><Link href="/employer/requirement" className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white">Hire staff</Link><Link href="/services/request" className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white">Request service</Link></div></div></section>

      <footer id="contact" className="landing-footer text-[#d9ebe1]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8"><div><div className="flex items-center gap-3"><Image src="/brand/cg-job-care-logo.svg" alt="CG Job Care" width={164} height={40} className="h-10 w-auto brightness-0 invert" /></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#a8c1b2]">Jobs, manpower, security, care, housekeeping aur pest control support across Chhattisgarh.</p><div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-[#d9ebe1]"><Quote size={14} className="text-[#ffe092]" /> Local support, clear process</div></div><div><strong className="text-white">Job seekers</strong><div className="mt-4 grid gap-3 text-sm"><Link href="/jobs" className="hover:text-white">Find jobs</Link><Link href="/candidate/register" className="hover:text-white">Candidate registration</Link><Link href="/candidate/applications" className="hover:text-white">Track applications</Link></div></div><div><strong className="text-white">Employers & customers</strong><div className="mt-4 grid gap-3 text-sm"><Link href="/employer/requirement" className="hover:text-white">Hire staff</Link><Link href="/services" className="hover:text-white">Explore services</Link><Link href="/services/request" className="hover:text-white">Request a service</Link></div></div><div><strong className="text-white">Contact</strong><p className="mt-4 text-sm leading-6">{settings.address}{settings.workingHours && <><br />{settings.workingHours}</>}{settings.phone && <><br /><a href={`tel:${settings.phone}`} className="font-bold text-white">{settings.phone}</a></>}</p></div></div><div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 px-5 py-5 text-center text-xs text-[#8eaa9b]"><span>© {new Date().getFullYear()} {settings.companyName}. Jobs and facility services with local support.</span><Link href="/privacy" className="hover:text-white">Privacy Policy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div></footer>
    </main>
  );
}
