import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, CheckCircle2, ImageIcon, MapPin, ShieldCheck, Star } from "lucide-react";
import { ServiceReviewForm } from "@/components/service-review-form";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";
import { CHHATTISGARH_SERVICE_CITIES, isServicePageSlug, SERVICE_PAGES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { getSiteUrl } from "@/lib/seo";
import { resolveServiceImages } from "@/lib/site-images";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) return {};
  const service = SERVICE_PAGES[slug];
  const canonical = `/services/${slug}`;
  return {
    title: service.seoTitle,
    description: service.seoDescription,
    keywords: service.searchTerms,
    alternates: { canonical },
    openGraph: { title: service.seoTitle, description: service.seoDescription, url: canonical, type: "website", locale: "en_IN", images: [{ url: service.heroImage, alt: `${service.shortTitle} services in Chhattisgarh` }] },
    twitter: { card: "summary_large_image", title: service.seoTitle, description: service.seoDescription, images: [service.heroImage] },
  };
}

export default async function DedicatedServicePage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) notFound();
  const service = SERVICE_PAGES[slug];
  const [reviews, settings] = await Promise.all([
    portalStore.listApprovedServiceReviews(slug),
    portalStore.getSiteSettings(),
  ]);
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const serviceImages = await resolveServiceImages(settings, slug);
  const baseUrl = getSiteUrl();
  const canonicalUrl = `${baseUrl}/services/${slug}`;
  const organizationId = `${baseUrl}/#organization`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: settings.companyName,
        url: baseUrl,
        ...(settings.email ? { email: settings.email } : {}),
        ...(settings.phone ? { telephone: settings.phone } : {}),
        ...((settings.address || settings.city || settings.state) ? { address: { "@type": "PostalAddress", ...(settings.address ? { streetAddress: settings.address } : {}), ...(settings.city ? { addressLocality: settings.city } : {}), ...(settings.state ? { addressRegion: settings.state } : {}), addressCountry: "IN" } } : {}),
        ...((settings.facebookUrl || settings.instagramUrl || settings.googleBusinessProfileUrl) ? { sameAs: [settings.facebookUrl, settings.instagramUrl, settings.googleBusinessProfileUrl].filter(Boolean) } : {}),
        areaServed: CHHATTISGARH_SERVICE_CITIES.map((city) => ({ "@type": "City", name: `${city}, Chhattisgarh` })),
      },
      {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: `${service.shortTitle} in Raipur and Chhattisgarh`,
        serviceType: service.shortTitle,
        description: service.seoDescription,
        url: canonicalUrl,
        image: serviceImages.heroImage.startsWith("http") ? serviceImages.heroImage : `${baseUrl}${serviceImages.heroImage}`,
        provider: { "@id": organizationId },
        areaServed: CHHATTISGARH_SERVICE_CITIES.map((city) => ({ "@type": "City", name: `${city}, Chhattisgarh` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          { "@type": "ListItem", position: 2, name: "Services", item: `${baseUrl}/services` },
          { "@type": "ListItem", position: 3, name: service.shortTitle, item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: service.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F8FBF9] text-[#1E2B26]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <section className="relative overflow-hidden bg-[#0E3D31] text-white">
        <Image src={serviceImages.heroImage} alt="" fill priority sizes="100vw" unoptimized={serviceImages.heroImage.startsWith("http")} className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#092B23] via-[#0E3D31]/95 to-[#0E3D31]/45" />
        <div className="relative mx-auto grid min-h-[530px] max-w-7xl items-end gap-8 px-5 py-14 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[.16em] text-[#FFE093]">{service.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-.03em] sm:text-5xl lg:text-6xl">{service.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#E0ECE6] sm:text-lg">{service.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={service.primaryHref} className="inline-flex items-center gap-2 rounded-lg bg-[#F4C95D] px-5 py-3.5 text-sm font-black text-[#18382F]">{service.primaryLabel}<ArrowRight size={17} /></Link><Link href={service.secondaryHref} className="rounded-lg border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-black backdrop-blur">{service.secondaryLabel}</Link></div>
          </div>
          <aside className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <BadgeCheck className="text-[#FFE093]" />
            <h2 className="mt-4 text-xl font-black">Clear local coordination</h2>
            <p className="mt-2 text-sm leading-6 text-[#DCE9E3]">{service.description}</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold"><MapPin size={16} className="text-[#FFE093]" /> Raipur &amp; Chhattisgarh</div>
          </aside>
        </div>
      </section>

      <section className="border-b border-[#DCE8E1] bg-white"><div className="mx-auto grid max-w-7xl sm:grid-cols-3">{service.highlights.map((item) => <div key={item.label} className="border-b border-[#E7EEE9] px-5 py-6 text-center sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-2xl font-black text-[#157A4A]">{item.value}</p><p className="mt-1 text-sm font-bold text-[#5C6B63]">{item.label}</p></div>)}</div></section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="max-w-2xl"><p className="section-kicker text-[#157A4A]">WHAT YOU GET</p><h2 className="section-title">Service scope, clearly explained.</h2><p className="mt-4 leading-7 text-[#5C6B63]">Requirement share karne se pehle available support aur process samajh sakte hain.</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">{service.included.map((item, index) => <article key={item.title} className="rounded-xl border border-[#DCE8E1] bg-white p-6"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#E8F5ED] font-black text-[#157A4A]">0{index + 1}</span><h3 className="mt-5 text-xl font-black">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[#5C6B63]">{item.text}</p></article>)}</div>
      </section>

      <section className="border-y border-[#DCE8E1] bg-[#EEF5F0]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:px-8 lg:py-20"><div><p className="section-kicker text-[#157A4A]">HOW IT WORKS</p><h2 className="section-title">Simple four-step process.</h2><p className="mt-4 leading-7 text-[#5C6B63]">Aapki enquiry sahi operational team tak jaati hai aur requirement ke according next step confirm hota hai.</p><Link href={service.primaryHref} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">Start your request <ArrowRight size={16} /></Link></div><ol className="grid gap-4 sm:grid-cols-2">{service.process.map((step, index) => <li key={step} className="flex gap-4 rounded-xl bg-white p-5 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#157A4A] text-sm font-black text-white">{index + 1}</span><div><strong className="block">{step}</strong><p className="mt-1 text-xs leading-5 text-[#5C6B63]">Team aapko relevant update aur coordination provide karegi.</p></div></li>)}</ol></div></section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <article><p className="section-kicker text-[#157A4A]">LOCAL SERVICE INFORMATION</p><h2 className="section-title">{service.searchHeading}</h2><div className="mt-5 grid gap-4 text-[15px] leading-7 text-[#4B5A52]">{service.searchParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><h3 className="mt-7 text-lg font-black">Common requirements we handle</h3><ul className="mt-4 grid gap-3 sm:grid-cols-2">{service.localNeeds.map((need) => <li key={need} className="flex items-start gap-2 text-sm font-semibold text-[#43564C]"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#157A4A]" />{need}</li>)}</ul></article>
          <aside className="rounded-2xl border border-[#DCE8E1] bg-white p-6 lg:p-8"><p className="text-xs font-black tracking-[.12em] text-[#157A4A]">AREAS WE SERVE</p><h3 className="mt-2 text-2xl font-black">Major cities across Chhattisgarh</h3><p className="mt-3 text-sm leading-6 text-[#5C6B63]">In cities se service request accept ki jaati hai. Exact availability, visit ya deployment date verification ke baad confirm hoti hai.</p><div className="mt-5 flex flex-wrap gap-2">{CHHATTISGARH_SERVICE_CITIES.map((city) => <span key={city} className="rounded-full border border-[#CFE0D8] bg-[#F3F8F5] px-3 py-2 text-xs font-bold text-[#0F5C38]">{city}</span>)}</div><Link href="/locations" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#0F5C38]">View Chhattisgarh coverage <ArrowRight size={16} /></Link></aside>
        </div>
        <div className="mt-10 border-t border-[#DCE8E1] pt-8"><p className="text-xs font-black tracking-[.12em] text-[#5C6B63]">EXPLORE OTHER SERVICES</p><div className="mt-4 flex flex-wrap gap-3">{SERVICE_PAGE_SLUGS.filter((item) => item !== slug).map((item) => <Link key={item} href={`/services/${item}`} className="rounded-lg border border-[#CFE0D8] bg-white px-4 py-2.5 text-sm font-bold text-[#0F5C38] hover:border-[#157A4A]">{SERVICE_PAGES[item].shortTitle}</Link>)}</div></div>
      </section>

      <section className="border-t border-[#DCE8E1] bg-[#F8FBF9]"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker text-[#157A4A]">WORK GALLERY</p><h2 className="section-title">Completed work ki photos.</h2></div></div>
        {serviceImages.gallery.length ? <div className="mt-8 grid gap-5 md:grid-cols-3">{serviceImages.gallery.map((image, index) => <figure key={image.src} className={`group overflow-hidden rounded-2xl bg-[#E7EEE9] ${index === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
          <div className={`relative ${index === 0 ? "h-80 md:h-full md:min-h-[500px]" : "h-60"}`}>
            <Image src={image.src} alt={image.caption} fill sizes={index === 0 ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"} unoptimized={image.src.startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" />
          </div>
          <figcaption className="bg-white px-4 py-3 text-sm font-bold">{image.caption}</figcaption>
        </figure>)}</div> : <div className="mt-8 flex items-start gap-3 rounded-xl border border-dashed border-[#CCDAD2] bg-white p-6 text-sm leading-6 text-[#5C6B63]"><ImageIcon className="mt-0.5 shrink-0 text-[#157A4A]" size={20} /><p>Approved completed-work photos abhi available nahi hain. Upar di gayi service image ek representative illustration hai; team verified project photos yahan publish karegi.</p></div>}
      </div></section>

      <section className="border-y border-[#DCE8E1] bg-white"><div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]"><div><p className="section-kicker text-[#157A4A]">CUSTOMER REVIEWS</p><div className="mt-2 flex flex-wrap items-end gap-4"><h2 className="section-title">Verified customer feedback.</h2>{reviews.length > 0 && <div className="mb-1 flex items-center gap-2 rounded-full bg-[#FFF7E3] px-3 py-1.5 text-sm font-black text-[#705715]"><Star size={16} className="fill-[#D4A72C] text-[#D4A72C]" />{averageRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}</div>}</div>
          {reviews.length === 0 ? <div className="mt-7 rounded-xl border border-dashed border-[#CCDAD2] bg-[#F8FBF9] p-8"><ShieldCheck className="text-[#157A4A]" /><h3 className="mt-4 text-lg font-black">Abhi koi verified review publish nahi hua.</h3><p className="mt-2 text-sm leading-6 text-[#5C6B63]">Service use karne ke baad pehla verified feedback share karein.</p></div> : <div className="mt-7 grid gap-4 sm:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-xl border border-[#E0E9E3] bg-[#F8FBF9] p-5"><div role="img" className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} className={value <= review.rating ? "fill-[#D4A72C] text-[#D4A72C]" : "text-[#CDD7D1]"} />)}</div><p className="mt-4 text-sm leading-6 text-[#3F5047]">“{review.comment}”</p><div className="mt-5 border-t border-[#E0E9E3] pt-4"><strong className="text-sm">{review.customerName}</strong><p className="mt-1 text-xs text-[#5C6B63]">{review.city || "Verified customer"} · {new Date(review.createdAt).toLocaleDateString("en-IN")}</p></div></article>)}</div>}
        </div><ServiceReviewForm serviceSlug={slug} /></div></div></section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[.75fr_1.25fr] lg:px-8 lg:py-20"><div><p className="section-kicker text-[#157A4A]">COMMON QUESTIONS</p><h2 className="section-title">Aapke questions, clear answers.</h2></div><div className="grid gap-3">{service.faqs.map((faq) => <details key={faq.question} className="group rounded-xl border border-[#DCE8E1] bg-white p-5"><summary className="cursor-pointer list-none font-black">{faq.question}<span className="float-right text-[#157A4A] group-open:rotate-45">+</span></summary><p className="mt-3 pr-8 text-sm leading-6 text-[#5C6B63]">{faq.answer}</p></details>)}</div></section>

      <section className="bg-[#0E3D31] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-7 px-5 py-12 lg:px-8"><div><p className="text-xs font-black tracking-[.12em] text-[#FFE093]">READY TO BEGIN?</p><h2 className="mt-2 text-3xl font-black">Apni requirement aaj share karein.</h2><p className="mt-2 text-sm text-[#CFE0D8]">Simple form submit karein; relevant team aapse next step ke liye connect karegi.</p></div><Link href={service.primaryHref} className="inline-flex items-center gap-2 rounded-lg bg-[#F4C95D] px-5 py-3.5 text-sm font-black text-[#18382F]">{service.primaryLabel}<ArrowRight size={17} /></Link></div></section>

      <footer className="bg-[#081F1A] px-5 py-7 text-center text-xs text-[#91A69C]">© {new Date().getFullYear()} {settings.companyName}. Jobs and facility services with local support.</footer>
    </main>
  );
}
