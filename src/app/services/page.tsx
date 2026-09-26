import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, Check, HeartHandshake, MapPin, Phone, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SERVICE_PAGES, type ServicePageSlug } from "@/lib/service-pages";
import { portalStore } from "@/lib/portal";
import { resolveServiceImages } from "@/lib/site-images";
import styles from "./services.module.css";

const serviceCards = [
  { slug: "security-services", title: "Security Guard Services", icon: ShieldCheck, tone: "blue" },
  { slug: "pest-control", title: "Pest Control", icon: Sparkles, tone: "yellow" },
  { slug: "baby-care", title: "Baby Care & Caretaker", icon: HeartHandshake, tone: "purple" },
  { slug: "housekeeping", title: "Housekeeping", icon: UsersRound, tone: "green" },
  { slug: "job-placement", title: "Jobs & Recruitment", icon: BriefcaseBusiness, tone: "orange" },
] as const satisfies ReadonlyArray<{ slug: ServicePageSlug; title: string; icon: typeof ShieldCheck; tone: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = `Security, Care & Facility Services | ${settings.companyName}`;
  const description = "Explore security guards, baby care, caretakers, housekeeping, pest control and job placement in Raipur and across Chhattisgarh.";
  return {
    title, description,
    keywords: ["security guard Raipur", "baby care Raipur", "caretaker Raipur", "housekeeping Raipur", "pest control Raipur", "facility services Chhattisgarh"],
    alternates: { canonical: "/services" },
    openGraph: { title, description, url: "/services", type: "website", locale: "en_IN", siteName: settings.companyName },
  };
}

export default async function ServicesPage() {
  const settings = await portalStore.getSiteSettings();
  const services = await Promise.all(serviceCards.map(async (card) => ({
    ...card,
    content: SERVICE_PAGES[card.slug],
    image: (await resolveServiceImages(settings, card.slug)).heroImage,
  })));

  return (
    <main className={`classic-page ${styles.page}`}>
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="services-heading">
        <div className={`classic-container ${styles.heroGrid}`}>
          <div>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Services</span></nav>
            <p className="classic-eyebrow">CARE FOR EVERYDAY LIFE</p>
            <h1 id="services-heading">The right people.<br /><span>For every</span> <em>need.</em></h1>
            <p className={styles.intro}>A safer workplace, a cleaner home, a little extra care. Find the service you need, all in one place.</p>
            <div className={styles.actions}>
              <Link href="#all-services" className="classic-button classic-button-blue">Explore Services <ArrowRight size={17} /></Link>
              <Link href="/services/request" className="classic-button classic-button-light">Book a Service</Link>
            </div>
            <p className={styles.location}><MapPin size={15} aria-hidden="true" /> Serving Raipur &amp; Chhattisgarh</p>
          </div>
          <div className={styles.quickPanel}>
            <div className={styles.panelHeading}><span>WHAT DO YOU NEED?</span><span>{services.length} services</span></div>
            <div className={styles.quickGrid}>
              {services.map(({ slug, title, icon: Icon, tone }) => (
                <Link key={slug} href={`#${slug}`} className={`${styles.quickLink} ${styles[tone]}`}>
                  <Icon size={22} aria-hidden="true" /><span>{title}</span><ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <p className={styles.panelNote}><Check size={15} aria-hidden="true" /> One local team. A simple process.</p>
          </div>
        </div>
      </section>

      <section id="all-services" className={`classic-container ${styles.catalog}`} aria-labelledby="catalog-heading">
        <div className={styles.sectionHeading}>
          <div><p className="classic-eyebrow">OUR SERVICES</p><h2 id="catalog-heading">Support that fits your life.</h2></div>
          <p>Explore what&apos;s included and share your requirement. Our team will help with the next step.</p>
        </div>
        <div className={styles.grid}>
          {services.map(({ slug, title, icon: Icon, tone, content, image }, index) => (
            <article key={slug} id={slug} className={`${styles.card} ${styles[tone]}`}>
              <Link href={`/services/${slug}`} className={styles.imageLink} aria-label={`Explore ${title}`}>
                <Image src={image} alt={`${title} in Chhattisgarh`} fill sizes="(max-width: 650px) calc(100vw - 28px), (max-width: 1220px) 48vw, 570px" unoptimized={image.startsWith("http")} className={styles.image} />
                <span className={styles.imageBadge}><Icon size={16} aria-hidden="true" />{content.eyebrow}</span>
                <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
              </Link>
              <div className={styles.cardBody}>
                <h3><Link href={`/services/${slug}`}>{title}</Link></h3>
                <p className={styles.summary}>{content.summary}</p>
                <ul className={styles.included}>{content.included.map((item) => <li key={item.title}><Check size={14} aria-hidden="true" />{item.title}</li>)}</ul>
                <div className={styles.cardActions}>
                  <Link href={content.primaryHref} className={styles.bookButton}>{content.primaryLabel}<ArrowRight size={15} /></Link>
                  <Link href={`/services/${slug}`} className={styles.details}>View details <ArrowUpRight size={15} /></Link>
                </div>
                {slug === "baby-care" && <Link href={content.secondaryHref} className={styles.caretakerLink}>{content.secondaryLabel} <ArrowRight size={14} /></Link>}
              </div>
            </article>
          ))}
          <aside className={styles.helpCard}>
            <span className={styles.helpIcon}><Building2 size={27} aria-hidden="true" /></span>
            <p className={styles.helpEyebrow}>FOR YOUR BUSINESS</p>
            <h3>A team you can<br />count on.</h3>
            <p>Need regular staff or support for a larger facility? Share your location, roles and team size with us.</p>
            <ul><li><Check size={16} />Security &amp; facility teams</li><li><Check size={16} />Recurring staffing needs</li><li><Check size={16} />Local coordination</li></ul>
            <Link href="/employer/requirement" className="classic-button classic-button-white">Hire Staff <ArrowRight size={17} /></Link>
          </aside>
        </div>
      </section>

      <section className={`classic-container ${styles.process}`} aria-labelledby="process-heading">
        <div className={styles.sectionHeading}><div><p className="classic-eyebrow">SIMPLE &amp; EASY</p><h2 id="process-heading">A little detail. A clear next step.</h2></div></div>
        <ol>
          <li><span>01</span><div><h3>Choose your service</h3><p>Find the right support for your home or business.</p></div></li>
          <li><span>02</span><div><h3>Tell us what you need</h3><p>Share your location, schedule and requirements.</p></div></li>
          <li><span>03</span><div><h3>Plan with our team</h3><p>We confirm scope, availability and the next steps.</p></div></li>
        </ol>
      </section>

      <section className={`classic-container ${styles.contact}`} aria-labelledby="contact-heading">
        <div><p>LET&apos;S GET STARTED</p><h2 id="contact-heading">Not sure which service to choose?</h2><span>Tell us what you need. We&apos;ll help you find the right support.</span></div>
        <div className={styles.contactActions}>
          <Link href="/services/request" className="classic-button classic-button-white">Request a Service <ArrowRight size={17} /></Link>
          {settings.phone ? <a href={`tel:${settings.phone}`} className={styles.callLink}><Phone size={16} />{settings.phone}</a> : <Link href="/contact" className={styles.callLink}>Talk to our team <ArrowUpRight size={16} /></Link>}
        </div>
      </section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/jobs">Find Jobs</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
