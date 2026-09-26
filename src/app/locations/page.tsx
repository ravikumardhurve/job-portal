import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, MapPin, Navigation, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CHHATTISGARH_SERVICE_CITIES, SERVICE_PAGES, SERVICE_PAGE_SLUGS } from "@/lib/service-pages";
import { portalStore } from "@/lib/portal";
import { getSiteUrl } from "@/lib/seo";
import { CityDirectory } from "./city-directory";
import styles from "./locations.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = `Jobs & Services Across Chhattisgarh | ${settings.companyName}`;
  const description = "Explore city-wise jobs and service enquiries in Raipur, Bhilai, Durg, Bilaspur and other Chhattisgarh cities. Check local availability with our team.";
  return { title, description, alternates: { canonical: "/locations" }, openGraph: { title, description, url: "/locations", type: "website", locale: "en_IN", siteName: settings.companyName } };
}

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

const faqs = [
  { question: "Does every listed city have an office?", answer: "No. This directory lists cities for job searches and service enquiries, not branch offices. For our published contact details and location, visit the Contact page and confirm before planning a visit." },
  { question: "What if there are no jobs in my city?", answer: "Published vacancies change over time. Try nearby cities or browse all jobs. You can also create a candidate profile with your location and work preferences; registration does not guarantee a job." },
  { question: "Can I request a service in a nearby town or village?", answer: "Yes. Share your actual city or town, locality and requirements in the service request form. Our team will review the location and confirm whether the requested support can be arranged." },
];

export default async function LocationsPage() {
  const settings = await portalStore.getSiteSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${settings.companyName} locations in Chhattisgarh`,
    url: `${getSiteUrl()}/locations`,
    description: "City-wise job searches and service enquiries. Local availability is confirmed after review.",
    mainEntity: { "@type": "ItemList", itemListElement: CHHATTISGARH_SERVICE_CITIES.map((city, index) => ({ "@type": "ListItem", position: index + 1, name: `${city}, Chhattisgarh` })) },
  };
  return (
    <main className={`classic-page ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="locations-heading">
        <div className="classic-container">
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Locations</span></nav>
          <div className={styles.heroGrid}>
            <div>
              <p className="classic-eyebrow">ROOTED IN CHHATTISGARH</p>
              <h1 id="locations-heading">Your city.<br /><span>Your next</span><br /><em>possibility.</em></h1>
              <p className={styles.intro}>Find work closer to home. Find support for the people and places that matter. Explore jobs and share your service needs with {settings.companyName}, city by city.</p>
              <div className={styles.heroActions}><a href="#city-directory" className="classic-button classic-button-blue">Explore Locations <ArrowRight size={17} /></a><Link href="/contact" className={styles.textLink}>Talk to Our Team <ArrowUpRight size={16} /></Link></div>
            </div>
            <aside className={styles.finder}>
              <span className={styles.finderIcon}><Navigation size={27} /></span>
              <p className={styles.cardEyebrow}>A LOCAL PLACE TO START</p>
              <h2>Where are you<br />looking for work?</h2>
              <p className={styles.finderCopy}>Choose a city to see its currently published vacancies.</p>
              <form action="/jobs" method="get">
                <label htmlFor="jobs-city">Your preferred city</label>
                <select id="jobs-city" name="city" defaultValue="" required><option value="" disabled>Select a city</option>{CHHATTISGARH_SERVICE_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select>
                <button type="submit">Find Jobs in This City <ArrowRight size={16} /></button>
              </form>
              <div className={styles.finderNote}><MapPin size={16} /><p>Looking for a service instead?<br /><a href="#city-directory">Choose your city below.</a></p></div>
            </aside>
          </div>
        </div>
      </section>

      <section id="city-directory" className={`classic-container ${styles.directory}`} aria-labelledby="directory-heading">
        <div className={styles.sectionHeading}><div><p className="classic-eyebrow">FIND YOUR LOCATION</p><h2 id="directory-heading" className={styles.heading}>Local needs. One place to begin.</h2></div><p>Browse openings or send a service requirement for your city.</p></div>
        <CityDirectory cities={CHHATTISGARH_SERVICE_CITIES.map((name) => ({ name, description: cityDetails[name] }))} />
        <div className={styles.coverageNote}><MapPin size={19} /><p><strong>A note on availability.</strong> These are enquiry locations, not a list of offices. Jobs, staff and services vary by city. Your exact locality, requirements and schedule are reviewed before availability is confirmed.</p></div>
      </section>

      <section className={styles.services} aria-labelledby="services-heading"><div className="classic-container">
        <div className={styles.sectionHeading}><div><p className="classic-eyebrow">MORE THAN A LOCATION</p><h2 id="services-heading" className={styles.heading}>What brings you here?</h2></div><p>Understand the service before you share your requirement.</p></div>
        <div className={styles.serviceGrid}>{SERVICE_PAGE_SLUGS.map((slug, index) => <Link key={slug} href={`/services/${slug}`}><span>{String(index + 1).padStart(2, "0")}</span><h3>{SERVICE_PAGES[slug].shortTitle}</h3><p>{SERVICE_PAGES[slug].summary}</p><span className={styles.serviceAction}>Explore service <ArrowUpRight size={16} /></span></Link>)}</div>
      </div></section>

      <section className={`classic-container ${styles.localSection}`} aria-labelledby="coverage-heading">
        <div><p className="classic-eyebrow">YOUR LOCALITY MATTERS</p><h2 id="coverage-heading" className={styles.heading}>A city is the start.<br /><span>The details make the difference.</span></h2><p className={styles.localIntro}>A home in the city centre and a workplace on the outskirts may need different arrangements. Help us understand where you are and what support you need.</p><ul className={styles.checklist}><li><Check size={17} />Your city, locality and a nearby landmark</li><li><Check size={17} />The service or staff you are looking for</li><li><Check size={17} />Your preferred start date and schedule</li></ul><Link href="/services/request" className={styles.textLink}>Share a Service Requirement <ArrowRight size={16} /></Link></div>
        <aside className={styles.nearbyCard}><MapPin size={30} /><p>DON&apos;T SEE YOUR LOCATION?</p><h3>Tell us where<br />you need us.</h3><p>A nearby town, a new locality or a workplace outside the city—share the details. We&apos;ll review your request and discuss what may be possible.</p><Link href="/contact">Ask About Your Area <ArrowUpRight size={17} /></Link><small>Submitting an enquiry does not confirm a booking.</small></aside>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-heading"><div className={`classic-container ${styles.faqGrid}`}><div><p className="classic-eyebrow">GOOD TO KNOW</p><h2 id="faq-heading" className={styles.heading}>A little local clarity.</h2></div><div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question}><summary><span>{question}</span><Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div></section>

      <section className={`classic-container ${styles.cta}`}><div><BriefcaseBusiness size={25} /><h2>Your next opportunity<br />could be closer than you think.</h2><p>Create a candidate profile and explore roles that fit your location and skills.</p></div><Link href="/candidate/register" className="classic-button classic-button-white">Create Your Profile <ArrowRight size={17} /></Link></section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/jobs">Find Jobs</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
