import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, HeartHandshake, ImageIcon, MapPin, Phone, Plus, ShieldCheck, Sparkles, Star, UsersRound } from "lucide-react";
import { ServiceReviewForm } from "@/components/service-review-form";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";
import { CHHATTISGARH_SERVICE_CITIES, isServicePageSlug, SERVICE_PAGES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { getSiteUrl } from "@/lib/seo";
import { resolveServiceImages } from "@/lib/site-images";
import styles from "./service-detail.module.css";

const presentation = {
  "job-placement": { icon: BriefcaseBusiness, tone: "orange" },
  "security-services": { icon: ShieldCheck, tone: "blue" },
  "baby-care": { icon: HeartHandshake, tone: "purple" },
  housekeeping: { icon: UsersRound, tone: "green" },
  "pest-control": { icon: Sparkles, tone: "yellow" },
} as const;

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServicePageSlug(slug)) return {};
  const service = SERVICE_PAGES[slug];
  const canonical = `/services/${slug}`;
  const settings = await portalStore.getSiteSettings();
  const images = await resolveServiceImages(settings, slug);
  const title = service.seoTitle.replaceAll("CG Job Care", settings.companyName);
  return {
    title,
    description: service.seoDescription,
    keywords: service.searchTerms,
    alternates: { canonical },
    openGraph: { title, description: service.seoDescription, url: canonical, type: "website", locale: "en_IN", siteName: settings.companyName, images: [{ url: images.heroImage, alt: `${service.shortTitle} services in Chhattisgarh` }] },
    twitter: { card: "summary_large_image", title, description: service.seoDescription, images: [images.heroImage] },
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

  const { icon: ServiceIcon, tone } = presentation[slug];
  const brandCopy = (text: string) => text.replaceAll("CG Job Care", settings.companyName);

  return (
    <main className={`classic-page ${styles.page} ${styles[tone]}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="service-heading">
        <div className="classic-container">
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/services">Services</Link><span aria-hidden="true">/</span><span aria-current="page">{service.shortTitle}</span></nav>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className="classic-eyebrow">{service.eyebrow}</p>
              <h1 id="service-heading">{service.title}</h1>
              <p className={styles.summary}>{brandCopy(service.summary)}</p>
              <div className={styles.heroActions}><Link href={service.primaryHref} className="classic-button classic-button-blue">{service.primaryLabel}<ArrowRight size={17} /></Link><Link href={service.secondaryHref} className="classic-button classic-button-light">{service.secondaryLabel}<ArrowUpRight size={16} /></Link></div>
              <dl className={styles.highlights}>{service.highlights.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
            </div>
            <figure className={styles.heroFigure}>
              <div className={styles.heroImage}><Image src={serviceImages.heroImage} alt={`${service.shortTitle} service illustration`} fill priority sizes="(max-width: 800px) 100vw, (max-width: 1220px) 45vw, 520px" unoptimized={serviceImages.heroImage.startsWith("http")} className={styles.image} /><span className={styles.imageLabel}><ServiceIcon size={19} />{service.shortTitle}</span></div>
              <figcaption><MapPin size={16} /><span>Local support in <strong>Raipur &amp; Chhattisgarh</strong></span></figcaption>
            </figure>
          </div>
        </div>
      </section>
      <nav className={styles.sectionNav} aria-label="On this page"><div className="classic-container"><a href="#scope">What&apos;s included</a><a href="#process">How it works</a><a href="#gallery">Gallery</a><a href="#reviews">Reviews</a><a href="#questions">FAQs</a></div></nav>

      <div className={`classic-container ${styles.contentLayout}`}>
        <div className={styles.content}>
          <section id="scope" className={styles.block} aria-labelledby="scope-heading">
            <p className="classic-eyebrow">WHAT YOU GET</p><h2 id="scope-heading" className={styles.heading}>The right support.<br /><span>A clearly defined scope.</span></h2>
            <p className={styles.sectionIntro}>{brandCopy(service.description)}</p>
            <div className={styles.scopeGrid}>{service.included.map((item, index) => <article key={item.title} className={styles.scopeCard}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </section>

          <section id="process" className={styles.block} aria-labelledby="process-heading">
            <p className="classic-eyebrow">SIMPLE &amp; EASY</p><h2 id="process-heading" className={styles.heading}>From enquiry to next steps.</h2>
            <ol className={styles.process}>{service.process.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><h3>{step}</h3></li>)}</ol>
          </section>

          <section className={styles.block} aria-labelledby="local-heading">
            <p className="classic-eyebrow">BUILT AROUND YOUR NEEDS</p><h2 id="local-heading" className={styles.heading}>{service.searchHeading}</h2>
            <div className={styles.localCopy}>{service.searchParagraphs.map((paragraph) => <p key={paragraph}>{brandCopy(paragraph)}</p>)}</div>
            <h3 className={styles.needsHeading}>Common requirements we handle</h3>
            <ul className={styles.needs}>{service.localNeeds.map((need) => <li key={need}><Check size={16} aria-hidden="true" />{need}</li>)}</ul>
          </section>
        </div>
        <aside className={styles.sidebar} aria-label="Booking and service coverage">
          <div className={styles.booking}>
            <span className={styles.bookingIcon}><ServiceIcon size={24} /></span>
            <p className={styles.bookingEyebrow}>LET&apos;S GET STARTED</p><h2>{slug === "job-placement" ? "Your next opportunity starts here." : "Tell us what you need."}</h2>
            <p>Share your location and requirement. Our team will confirm scope, availability and the next steps.</p>
            <Link href={service.primaryHref} className={styles.bookingButton}>{service.primaryLabel}<ArrowRight size={17} /></Link>
            {settings.phone ? <a href={`tel:${settings.phone}`} className={styles.call}><Phone size={16} />{settings.phone}</a> : <Link href="/contact" className={styles.call}>Talk to our team <ArrowUpRight size={16} /></Link>}
            <small>Availability and charges are confirmed after reviewing your requirement.</small>
          </div>
          <div className={styles.coverage}><MapPin size={22} /><h3>Close to where you need us.</h3><p>Enquiries accepted across Chhattisgarh. Service dates depend on local availability.</p><div className={styles.cities}>{CHHATTISGARH_SERVICE_CITIES.map((city) => <span key={city}>{city}</span>)}</div><Link href="/locations">Explore our coverage <ArrowUpRight size={15} /></Link></div>
        </aside>
      </div>

      <section id="gallery" className={`classic-container ${styles.gallerySection}`} aria-labelledby="gallery-heading">
        <div className={styles.sectionHeading}><div><p className="classic-eyebrow">WORK GALLERY</p><h2 id="gallery-heading" className={styles.heading}>A closer look at our work.</h2></div>{serviceImages.gallery.length > 0 && <p>Completed-work photos published by our team.</p>}</div>
        {serviceImages.gallery.length ? <div className={styles.gallery}>{serviceImages.gallery.map((photo, index) => <figure key={`${photo.src}-${index}`}><div><Image src={photo.src} alt={photo.caption} fill sizes="(max-width: 600px) 85vw, (max-width: 900px) 46vw, 380px" unoptimized={photo.src.startsWith("http")} className={styles.image} /></div><figcaption>{photo.caption}</figcaption></figure>)}</div> : <div className={styles.galleryEmpty}><ImageIcon size={22} /><p>Project photos will appear here once published. The service image above is representative, not a completed-project photo.</p></div>}
      </section>

      <section id="reviews" className={styles.reviewsSection} aria-labelledby="reviews-heading">
        <div className={`classic-container ${styles.reviewsLayout}`}>
          <div><p className="classic-eyebrow">CUSTOMER EXPERIENCES</p><h2 id="reviews-heading" className={styles.heading}>Feedback that matters.</h2>
            {reviews.length > 0 && <p className={styles.rating}><Star size={17} fill="currentColor" />{averageRating.toFixed(1)} <span>from {reviews.length} approved review{reviews.length === 1 ? "" : "s"}</span></p>}
            {reviews.length === 0 ? <div className={styles.reviewEmpty}><ShieldCheck size={26} /><h3>Be the first to share your experience.</h3><p>No approved reviews yet. Used this service? Tell us how it went. Reviews are checked before publication.</p></div> : <div className={styles.reviewList}>{reviews.map((review) => <article key={review.id} className={styles.review}><div role="img" aria-label={`${review.rating} out of 5 stars`} className={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} className={value <= review.rating ? styles.starFilled : styles.starEmpty} />)}</div><blockquote>“{review.comment}”</blockquote><div className={styles.reviewer}><span aria-hidden="true">{review.customerName.trim().slice(0, 1).toUpperCase()}</span><div><strong>{review.customerName}</strong><p>{review.city ? `${review.city} · ` : ""}{new Date(review.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div></div></article>)}</div>}
          </div>
          <ServiceReviewForm key={slug} serviceSlug={slug} />
        </div>
      </section>

      <section id="questions" className={`classic-container ${styles.faqSection}`} aria-labelledby="faq-heading"><div><p className="classic-eyebrow">A LITTLE MORE CLARITY</p><h2 id="faq-heading" className={styles.heading}>Good questions.<br /><span>Clear answers.</span></h2><p className={styles.sectionIntro}>Still have a question? We&apos;re here to help.</p><Link href="/contact" className={styles.textLink}>Contact our team <ArrowRight size={16} /></Link></div><div className={styles.faqList}>{service.faqs.map((faq) => <details key={faq.question}><summary><span>{faq.question}</span><Plus size={18} aria-hidden="true" /></summary><p>{brandCopy(faq.answer)}</p></details>)}</div></section>

      <section className={`classic-container ${styles.relatedSection}`} aria-labelledby="related-heading"><div className={styles.sectionHeading}><div><p className="classic-eyebrow">MORE WAYS WE CAN HELP</p><h2 id="related-heading" className={styles.heading}>Explore other services.</h2></div><Link href="/services" className={styles.textLink}>All services <ArrowRight size={16} /></Link></div><div className={styles.related}>{SERVICE_PAGE_SLUGS.filter((item) => item !== slug).map((item) => { const { icon: Icon, tone: relatedTone } = presentation[item]; return <Link key={item} href={`/services/${item}`} className={styles[relatedTone]}><span><Icon size={22} /></span><strong>{SERVICE_PAGES[item].shortTitle}</strong><ArrowUpRight size={17} /></Link>; })}</div></section>

      <section className={`classic-container ${styles.cta}`}><div><p>READY WHEN YOU ARE</p><h2>One requirement.<br />A clear next step.</h2><span>Share a few details and let our local team guide you.</span></div><div className={styles.ctaActions}><Link href={service.primaryHref} className="classic-button classic-button-white">{service.primaryLabel}<ArrowRight size={17} /></Link><Link href={service.secondaryHref} className={styles.ctaSecondary}>{service.secondaryLabel}<ArrowUpRight size={16} /></Link></div></section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/services">All Services</Link><Link href="/jobs">Find Jobs</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
