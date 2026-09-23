import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  PhoneCall,
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
  openGraph: { title: "Jobs & Local Services in Raipur | CG Job Care", description: "Jobs, manpower and trusted facility-service requests across Chhattisgarh.", url: "/", type: "website", locale: "en_IN", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CG Job Care jobs and local services in Chhattisgarh" }] },
  twitter: { card: "summary_large_image", title: "Jobs & Local Services in Raipur | CG Job Care", description: "Jobs, manpower and facility services across Chhattisgarh.", images: ["/twitter-image"] },
};

const services = [
  { icon: BriefcaseBusiness, eyebrow: "JOBS & RECRUITMENT", title: "Job Placement", text: "Freshers aur experienced candidates ke liye local job opportunities aur joining support.", points: ["Published vacancies", "Application tracking"], href: "/services/job-placement", action: "Explore service", image: SERVICE_IMAGES.jobPlacement, accent: "bg-[#E3F3EA] text-[#1F7A4D]" },
  { icon: ShieldCheck, eyebrow: "SECURITY", title: "Security Services", text: "Homes, offices, sites aur events ke liye guards, lady guards aur supervisors.", points: ["Site-ready staff", "Flexible requirements"], href: "/services/security-services", action: "Explore service", image: SERVICE_IMAGES.security, accent: "bg-[#E7EFFC] text-[#2F5AAE]" },
  { icon: HeartHandshake, eyebrow: "HOME CARE", title: "Baby & Caretaker", text: "Baby care, elder care aur patient support ke liye responsible caregivers.", points: ["Home-based support", "Requirement review"], href: "/services/baby-care", action: "Explore service", image: SERVICE_IMAGES.care, accent: "bg-[#F6ECFF] text-[#7F4BB0]" },
  { icon: UsersRound, eyebrow: "FACILITY STAFF", title: "Housekeeping", text: "Offices, homes, hotels aur commercial properties ke liye reliable cleaning staff.", points: ["Individual or team", "Home & business"], href: "/services/housekeeping", action: "Explore service", image: SERVICE_IMAGES.housekeeping, accent: "bg-[#F2EEDD] text-[#8A6810]" },
  { icon: Sparkles, eyebrow: "PEST MANAGEMENT", title: "Pest Control", text: "Residential aur commercial spaces ke liye practical pest treatment coordination.", points: ["Home & office", "Local coordination"], href: "/services/pest-control", action: "Explore service", image: SERVICE_IMAGES.pestControl, accent: "bg-[#FFF0E7] text-[#C9471E]" },
];

const journeys = [
  { icon: BriefcaseBusiness, label: "JOB SEEKER", title: "Mujhe job chahiye", text: "Profile banayein, published jobs dekhein aur application status track karein.", href: "/candidate/register", action: "Register as candidate", color: "bg-[#157A4A]" },
  { icon: Building2, label: "EMPLOYER", title: "Mujhe staff chahiye", text: "Apni vacancy aur manpower requirement private form se share karein.", href: "/employer/requirement", action: "Submit requirement", color: "bg-[#2F5AAE]" },
  { icon: HeartHandshake, label: "CUSTOMER", title: "Mujhe service chahiye", text: "Security, care, housekeeping ya pest control ke liye request bhejein.", href: "/services/request", action: "Request a service", color: "bg-[#7F4BB0]" },
];

export default async function Home() {
  const [landing, categories, settings] = await Promise.all([
    portalStore.getPublicLanding(),
    portalStore.listJobCategoryCounts(),
    portalStore.getSiteSettings(),
  ]);
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
    <main className="overflow-hidden bg-[#F8FBF9] text-[#1E2B26]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <div className="bg-[#0F5C38] px-5 py-2.5 text-center text-xs font-semibold text-white sm:text-sm">
        <span>{landing.announcement?.title ?? settings.homeAnnouncementText}</span>
        <Link href={landing.announcement?.link ?? "/jobs"} className="ml-2 font-black text-[#FFE093] underline underline-offset-4">View latest updates</Link>
      </div>

      <SiteHeader />

      <section className="hero-grid relative border-b border-[#DCE8E1] bg-[#EEF5F0]">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D4B04A]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:min-h-[610px] lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-14 lg:px-8 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#C8DED1] bg-white/80 px-3 py-1.5 text-xs font-black tracking-wide text-[#0F5C38]"><MapPin size={14} /> {settings.homeHeroBadge}</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem]">{settings.homeHeroTitle} <span className="text-[#157A4A]">{settings.homeHeroHighlight}</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#4B5A52] sm:text-lg sm:leading-8">{settings.homeHeroDescription}</p>
            <LandingSearch />
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#4B5A52] sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-[#157A4A]" /> Admin-reviewed listings</span>
              <span className="inline-flex items-center gap-1.5"><PhoneCall size={16} className="text-[#157A4A]" /> Local support</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-[#157A4A]" /> Private requirements</span>
            </div>
            {categories.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-black uppercase tracking-wide text-[#5C6B63]">Popular jobs</span>{categories.slice(0, 4).map((item) => <Link key={item.category} href={`/jobs?category=${encodeURIComponent(item.category)}`} className="rounded-full border border-[#C8DED1] bg-white px-3 py-1.5 text-xs font-bold text-[#0F5C38] hover:border-[#157A4A]">{item.category} · {item.count}</Link>)}</div>}
          </div>

          <aside className="hero-photo-card min-h-[360px] self-stretch overflow-hidden rounded-2xl bg-[#1E2B26] text-white shadow-[0_24px_70px_rgba(20,55,43,.22)] lg:min-h-[480px]">
            {heroBannerUrls.length > 0 ? <><HeroBannerCarousel images={heroBannerUrls} /><div className="hero-photo-shade absolute inset-0" /><div className="relative flex h-full flex-col justify-between p-7"><div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black backdrop-blur">CG JOB CARE</span><BadgeCheck className="text-[#FFE093]" /></div><div><h2 className="text-3xl font-black leading-tight">Real opportunities.<br />Reliable local support.</h2><p className="mt-4 max-w-md leading-7 text-[#E7F2EA]">Candidate, employer ya customer—har request sahi operational team tak pahunchti hai.</p><Link href="#choose" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-[#0F5C38]">Choose what you need <ArrowRight size={16} /></Link></div></div></> : <HeroJobsCarousel jobs={heroJobs} />}
          </aside>
        </div>
      </section>

      <section aria-label="Platform statistics" className="border-b border-[#DCE8E1] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:grid-cols-4 lg:px-8">{stats.map((stat, index) => <div key={stat.label} className={`py-6 text-center sm:py-7 ${index % 2 ? "border-l" : ""} border-[#E7EEE9] sm:border-l sm:first:border-l-0`}><p className="text-2xl font-black text-[#0F5C38] sm:text-3xl">{stat.value.toLocaleString("en-IN")}</p><p className="mt-1 text-xs font-bold text-[#5C6B63] sm:text-sm">{stat.label}</p></div>)}</div>
      </section>

      <section id="choose" className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl"><p className="section-kicker text-[#157A4A]">START HERE</p><h2 className="section-title">Aapko kis tarah ki help chahiye?</h2><p className="mt-4 leading-7 text-[#5C6B63]">Apni need select karein. Hum aapko seedha sahi form aur process tak le jayenge.</p></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{journeys.map((journey) => { const Icon = journey.icon; return <Link key={journey.title} href={journey.href} className="group relative overflow-hidden rounded-xl border border-[#DCE8E1] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"><div className={`absolute inset-y-0 left-0 w-1.5 ${journey.color}`} /><span className={`grid h-12 w-12 place-items-center rounded-xl text-white ${journey.color}`}><Icon size={22} /></span><p className="mt-6 text-xs font-black tracking-[.12em] text-[#5C6B63]">{journey.label}</p><h3 className="mt-2 text-2xl font-black">{journey.title}</h3><p className="mt-3 text-sm leading-6 text-[#5C6B63]">{journey.text}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">{journey.action} <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>; })}</div>
      </section>

      <section id="services" className="border-y border-[#DCE8E1] bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker text-[#157A4A]">ALL SERVICES</p><h2 className="section-title">{settings.homeServicesTitle}</h2><p className="mt-4 max-w-2xl leading-7 text-[#5C6B63]">{settings.homeServicesDescription}</p></div><Link href="/services" className="inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">Compare all services <ArrowRight size={16} /></Link></div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {displayServices.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title} className="group flex overflow-hidden rounded-xl border border-[#DCE8E1] bg-[#F8FBF9] md:block">
                  <div className="relative h-auto w-32 shrink-0 overflow-hidden md:h-40 md:w-full">
                    <Image src={service.image} alt={`${service.title} in Chhattisgarh`} fill sizes="(max-width: 768px) 8rem, (max-width: 1280px) 50vw, 20vw" unoptimized={service.image.startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" />
                    <span className={`absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-lg shadow-md ${service.accent}`}><Icon size={19} /></span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] font-black tracking-[.12em] text-[#157A4A]">{service.eyebrow}</p>
                    <h3 className="mt-2 text-lg font-black">{service.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5C6B63]">{service.text}</p>
                    <ul className="mt-4 grid gap-2 text-xs font-bold text-[#43564C]">{service.points.map((point) => <li key={point} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#157A4A]" />{point}</li>)}</ul>
                    <Link href={service.href} className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-[#0F5C38]">{service.action} <ArrowRight size={14} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="jobs" className="bg-[#0F3B33] py-14 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker text-[#FFE093]">FRESH OPPORTUNITIES</p><h2 className="section-title text-white">{settings.homeJobsTitle}</h2><p className="mt-4 max-w-2xl text-[#CFE0D8]">{settings.homeJobsDescription}</p></div><Link href="/jobs" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-3 text-sm font-black hover:bg-white hover:text-[#0F3B33]">Browse all jobs <ArrowRight size={16} /></Link></div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">{landing.jobs.length ? landing.jobs.map((job) => <article key={job.id} className="rounded-xl bg-white p-6 text-[#0F3B33] shadow-lg"><div className="flex items-center justify-between gap-3"><p className={`text-xs font-black tracking-wide ${job.urgent ? "text-[#C2410C]" : "text-[#1F7A4D]"}`}>{job.urgent ? "URGENT HIRING" : "PUBLISHED JOB"}</p><span className="rounded-full bg-[#EEF5F0] px-2.5 py-1 text-[10px] font-bold text-[#4B5A52]">{job.vacancies} openings</span></div><h3 className="mt-5 text-2xl font-black">{job.title}</h3><p className="mt-2 text-sm text-[#4B5A52]">{job.company}</p><p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#4B5A52]"><MapPin size={15} className="text-[#157A4A]" />{job.city}</p><div className="mt-7 flex items-end justify-between gap-3 border-t border-[#E7EEE9] pt-5"><div><p className="text-xs text-[#5C6B63]">Monthly salary</p><p className="mt-1 font-black">₹{job.salaryMin.toLocaleString("en-IN")} – ₹{job.salaryMax.toLocaleString("en-IN")}</p></div><Link href={`/jobs/${job.id}`} className="grid h-10 w-10 place-items-center rounded-full bg-[#E9F3ED] text-[#0F5C38]" aria-label={`View ${job.title}`}><ArrowRight size={17} /></Link></div></article>) : <div className="rounded-xl border border-white/20 bg-white/10 p-8 text-sm text-[#D9EBE5] lg:col-span-3">New job opportunities will appear here shortly. Candidate profile ready rakhein.</div>}</div>
        </div>
      </section>

      <section className="border-b border-[#DCE8E1] bg-white"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker text-[#157A4A]">ACROSS CHHATTISGARH</p><h2 className="section-title">Raipur se major cities tak local support.</h2><p className="mt-4 max-w-3xl leading-7 text-[#5C6B63]">Jobs aur service enquiries Raipur, Bhilai, Durg, Bilaspur, Korba, Rajnandgaon, Raigarh, Ambikapur, Jagdalpur aur Dhamtari se accept ki jaati hain. Availability verification ke baad confirm hoti hai.</p></div><Link href="/locations" className="inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">View all locations <ArrowRight size={16} /></Link></div><div className="mt-7 flex flex-wrap gap-2">{CHHATTISGARH_SERVICE_CITIES.map((city) => <Link key={city} href={`/jobs?city=${encodeURIComponent(city)}`} className="rounded-full border border-[#CFE0D8] bg-[#F8FBF9] px-4 py-2 text-sm font-bold text-[#0F5C38] hover:border-[#157A4A]">Jobs in {city}</Link>)}</div></div></section>

      {landing.posts.length > 0 && <section className="bg-[#F8FBF9]"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div><p className="section-kicker text-[#157A4A]">LATEST UPDATES</p><h2 className="section-title">News and helpful information.</h2><p className="mt-4 max-w-2xl leading-7 text-[#5C6B63]">Admin team ke latest hiring, company aur service updates.</p></div><div className="mt-8 grid gap-4 md:grid-cols-3">{landing.posts.map((post) => <article key={post.id} className="rounded-xl border border-[#DCE8E1] bg-white p-6"><p className="text-[10px] font-black tracking-[.12em] text-[#157A4A]">{post.category.replaceAll("_", " ")}</p><h3 className="mt-3 text-xl font-black">{post.title}</h3><p className="mt-3 text-sm leading-6 text-[#5C6B63]">{post.excerpt}</p></article>)}</div></div></section>}

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-8 lg:py-20">
        <div><p className="section-kicker text-[#157A4A]">SIMPLE & TRANSPARENT</p><h2 className="section-title">Request se response tak clear process.</h2><p className="mt-5 max-w-lg leading-7 text-[#5C6B63]">Job application aur service request alag operational teams handle karti hain. Aapko relevant updates aur follow-up milta hai.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/about" className="rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white">Know about us</Link>{settings.phone && <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-[#B9D6C6] px-5 py-3 text-sm font-black text-[#0F5C38]"><PhoneCall size={16} /> Call our team</a>}</div></div>
        <ol className="grid gap-4 sm:grid-cols-2"><li className="process-step"><b>01</b><span><strong className="block text-[#1E2B26]">Choose your need</strong><small className="mt-1 block leading-5 text-[#5C6B63]">Job, hiring or facility service.</small></span></li><li className="process-step"><b>02</b><span><strong className="block text-[#1E2B26]">Share basic details</strong><small className="mt-1 block leading-5 text-[#5C6B63]">Simple mobile-friendly form.</small></span></li><li className="process-step"><b>03</b><span><strong className="block text-[#1E2B26]">Team reviews request</strong><small className="mt-1 block leading-5 text-[#5C6B63]">Correct department handles it.</small></span></li><li className="process-step"><b>04</b><span><strong className="block text-[#1E2B26]">Get coordinated support</strong><small className="mt-1 block leading-5 text-[#5C6B63]">Updates through the next steps.</small></span></li></ol>
      </section>

      <section className="border-y border-[#DCE8E1] bg-[#E7F2EA]">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16"><div><p className="section-kicker text-[#157A4A]">READY TO START?</p><h2 className="section-title">{settings.homeCtaTitle}</h2><p className="mt-3 max-w-2xl text-[#4B5A52]">{settings.homeCtaDescription}</p></div><div className="flex flex-wrap gap-3"><Link href="/candidate/register" className="rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white">Register for jobs</Link><Link href="/employer/requirement" className="rounded-lg border border-[#157A4A] bg-white px-5 py-3 text-sm font-black text-[#0B4A2E]">Hire staff</Link><Link href="/services/request" className="rounded-lg border border-[#157A4A] bg-white px-5 py-3 text-sm font-black text-[#0B4A2E]">Request service</Link></div></div>
      </section>

      <footer id="contact" className="bg-[#0A2620] text-[#D9EBE5]">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8"><div><strong className="text-lg text-white">{settings.companyName}</strong><p className="mt-3 text-sm leading-6">Jobs, manpower, security, care, housekeeping aur pest control support across Chhattisgarh.</p></div><div><strong className="text-white">Job seekers</strong><div className="mt-3 grid gap-2 text-sm"><Link href="/jobs" className="hover:text-white">Find jobs</Link><Link href="/candidate/register" className="hover:text-white">Candidate registration</Link><Link href="/candidate/applications" className="hover:text-white">Track applications</Link></div></div><div><strong className="text-white">Employers & customers</strong><div className="mt-3 grid gap-2 text-sm"><Link href="/employer/requirement" className="hover:text-white">Hire staff</Link><Link href="/services" className="hover:text-white">Explore services</Link><Link href="/services/request" className="hover:text-white">Request a service</Link></div></div><div><strong className="text-white">Contact</strong><p className="mt-3 text-sm leading-6">{settings.address}{settings.workingHours && <><br />{settings.workingHours}</>}{settings.phone && <><br /><a href={`tel:${settings.phone}`} className="font-bold text-white">{settings.phone}</a></>}</p></div></div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 px-5 py-5 text-center text-xs text-[#91A69C]"><span>© {new Date().getFullYear()} {settings.companyName}. Jobs and facility services with local support.</span><Link href="/privacy" className="hover:text-white">Privacy Policy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div>
      </footer>
    </main>
  );
}
