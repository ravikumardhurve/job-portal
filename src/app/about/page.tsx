import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, Check, ClipboardCheck, HeartHandshake, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";
import { CHHATTISGARH_SERVICE_CITIES } from "@/lib/service-pages";
import styles from "./about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = `About ${settings.companyName} | Jobs, Care & Facility Services`;
  const description = `Meet ${settings.companyName}: connecting job seekers, employers, families and businesses with recruitment coordination and everyday facility support across Chhattisgarh.`;
  return {
    title, description,
    alternates: { canonical: "/about" },
    openGraph: { title, description, url: "/about", type: "website", locale: "en_IN", siteName: settings.companyName },
    twitter: { card: "summary", title, description },
  };
}

const audiences = [
  { icon: BriefcaseBusiness, tone: "blue", label: "FOR JOB SEEKERS", title: "A clearer path to your next role.", text: "Explore published openings with salary and location details. Build your profile, apply to relevant roles and follow application updates from your dashboard.", href: "/jobs", action: "Find your next job" },
  { icon: Building2, tone: "orange", label: "FOR EMPLOYERS", title: "People who fit your requirements.", text: "Tell us the role, location, shifts and team size you need. Your requirement is reviewed before moving into vacancy publishing, shortlisting and interview coordination.", href: "/employer/requirement", action: "Share a staffing need" },
  { icon: HeartHandshake, tone: "purple", label: "FOR HOMES & BUSINESSES", title: "Support for the everyday.", text: "From security and housekeeping to care and pest control, share what you need in one place. Our team reviews the scope, schedule and local availability with you.", href: "/services", action: "Explore our services" },
] as const;

const values = [
  { icon: MessageCircle, title: "Clarity before commitment", text: "Understand the role or service scope, location and next steps before you decide. Ask questions whenever something is unclear." },
  { icon: HeartHandshake, title: "People before paperwork", text: "A profile or request is only the starting point. Skills, family routines, working hours and practical needs all deserve attention." },
  { icon: ClipboardCheck, title: "A considered process", text: "Requirement review, relevant details and coordination help both sides make informed decisions. Availability is confirmed, not assumed." },
  { icon: UsersRound, title: "Respect in every interaction", text: "Our aim is a helpful, respectful experience for candidates, workers, families and employers, from the first enquiry to the next step." },
] as const;

const services = [
  { title: "Jobs & recruitment", description: "Opportunities and staffing coordination", href: "/services/job-placement", icon: BriefcaseBusiness, tone: "orange" },
  { title: "Security services", description: "Guards, supervisors and site support", href: "/services/security-services", icon: ShieldCheck, tone: "blue" },
  { title: "Baby care & caretaker", description: "Family routines and non-medical care", href: "/services/baby-care", icon: HeartHandshake, tone: "purple" },
  { title: "Housekeeping", description: "Support for homes and workplaces", href: "/services/housekeeping", icon: UsersRound, tone: "green" },
  { title: "Pest control", description: "Property-based treatment enquiries", href: "/services/pest-control", icon: Sparkles, tone: "yellow" },
] as const;

const steps = [
  { title: "Start with your need", text: "Search a role or share a service or staffing requirement, along with your location and preferences." },
  { title: "Get the details right", text: "Profiles and requirements are reviewed so the relevant team can understand the scope and coordinate next steps." },
  { title: "Move forward with clarity", text: "Discuss the opportunity, interview or service arrangements. Confirm details before proceeding." },
] as const;

export default async function AboutPage() {
  const settings = await portalStore.getSiteSettings();
  const address = [settings.address, settings.city, settings.state].filter(Boolean).join(", ");

  return (
    <main className={`classic-page ${styles.page}`}>
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="about-heading">
        <div className="classic-container">
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">About us</span></nav>
          <div className={styles.heroGrid}>
            <div>
              <p className="classic-eyebrow">LOCAL PEOPLE. PRACTICAL SUPPORT.</p>
              <h1 id="about-heading">Good work.<br /><span>Genuine care.</span><br /><em>Everyday support.</em></h1>
              <p className={styles.heroIntro}>We&apos;re {settings.companyName}. We bring job discovery, recruitment coordination and everyday services together—helping people take their next step with more clarity and less confusion.</p>
              <div className={styles.actions}><Link href="/services" className="classic-button classic-button-blue">Explore What We Do <ArrowRight size={17} /></Link><Link href="/contact" className="classic-button classic-button-light">Let&apos;s Talk <ArrowUpRight size={16} /></Link></div>
              <p className={styles.locationNote}><MapPin size={15} aria-hidden="true" />Connecting needs across Chhattisgarh</p>
            </div>
            <div className={styles.heroBoard}>
              <div className={styles.boardTop}><span>ONE PLATFORM</span><span>Many ways to help.</span></div>
              <div className={styles.boardStatement}><span>Opportunity.</span><span>People.</span><span>Peace of mind.</span></div>
              <div className={styles.boardPaths}>
                <Link href="/jobs"><span><BriefcaseBusiness size={21} /></span><div><strong>Find your next role</strong><small>For skills, goals and new beginnings</small></div><ArrowUpRight size={18} /></Link>
                <Link href="/employer/requirement"><span><Building2 size={21} /></span><div><strong>Build your team</strong><small>For the people your work needs</small></div><ArrowUpRight size={18} /></Link>
                <Link href="/services"><span><HeartHandshake size={21} /></span><div><strong>Find everyday support</strong><small>For your home, family and business</small></div><ArrowUpRight size={18} /></Link>
              </div>
              <p className={styles.boardNote}>Different needs. The same care and attention.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`classic-container ${styles.story}`} aria-labelledby="story-heading">
        <div><p className="classic-eyebrow">WHY WE EXIST</p><h2 id="story-heading" className={styles.heading}>Behind every requirement,<br /><span>there&apos;s a person.</span></h2></div>
        <div className={styles.storyCopy}><p>A job can mean a fresh start. The right staff can help a business run smoothly. A little support at home can give a family room to focus on what matters.</p><p>That is the idea behind {settings.companyName}: make it easier to discover opportunities, explain what you need and reach the right support. We connect these everyday needs through dedicated job and service journeys, with local coordination at the centre.</p><p>We believe a useful platform should do more than show a listing. It should help you understand your options and know what happens next.</p></div>
      </section>

      <section className={styles.audienceSection} aria-labelledby="audience-heading">
        <div className="classic-container">
          <div className={styles.sectionHeading}><div><p className="classic-eyebrow">WHO WE HELP</p><h2 id="audience-heading" className={styles.heading}>Different journeys.<br />One place to begin.</h2></div><p>Whether you&apos;re looking for work, building a team or arranging support, start with the path that fits you.</p></div>
          <div className={styles.audienceGrid}>{audiences.map(({ icon: Icon, tone, label, title, text, href, action }) => <article key={label} className={styles[tone]}><span className={styles.audienceIcon}><Icon size={25} /></span><p className={styles.cardEyebrow}>{label}</p><h3>{title}</h3><p className={styles.cardText}>{text}</p><Link href={href}>{action}<ArrowRight size={16} /></Link></article>)}</div>
        </div>
      </section>

      <section className={`classic-container ${styles.valuesSection}`} aria-labelledby="values-heading">
        <aside className={styles.mission}><span className={styles.missionIcon}><HeartHandshake size={28} /></span><p>OUR PURPOSE</p><h2>Make the next step<br /><em>a little easier.</em></h2><div>Our mission is to make local opportunities and practical support easier to access—with clear information, thoughtful coordination and respect for the people on both sides.</div><span className={styles.missionNote}><Check size={17} />Clear needs. Considered next steps.</span></aside>
        <div><p className="classic-eyebrow">WHAT GUIDES US</p><h2 id="values-heading" className={styles.heading}>The way we want<br />to make a difference.</h2><div className={styles.values}>{values.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div>
      </section>

      <section className={`classic-container ${styles.servicesSection}`} aria-labelledby="services-heading"><div className={styles.sectionHeading}><div><p className="classic-eyebrow">WHAT WE BRING TOGETHER</p><h2 id="services-heading" className={styles.heading}>Work, care and everything in between.</h2></div><Link href="/services" className={styles.textLink}>View all services <ArrowRight size={16} /></Link></div><div className={styles.serviceGrid}>{services.map(({ title, description, href, icon: Icon, tone }) => <Link key={href} href={href} className={styles[tone]}><span className={styles.serviceIcon}><Icon size={23} /></span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={17} /></Link>)}</div></section>

      <section className={styles.processSection} aria-labelledby="process-heading"><div className="classic-container"><div className={styles.sectionHeading}><div><p className="classic-eyebrow">HOW WE WORK</p><h2 id="process-heading" className={styles.heading}>Listen. Understand. Coordinate.</h2></div><p>A straightforward process, with the details discussed before the next step.</p></div><ol className={styles.steps}>{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol><p className={styles.processNote}><ClipboardCheck size={17} />Job selection rests with the employer. Service scope, availability and charges are confirmed after reviewing your requirement.</p></div></section>

      <section className={`classic-container ${styles.localSection}`} aria-labelledby="local-heading">
        <div><p className="classic-eyebrow">LOCAL CONNECTIONS</p><h2 id="local-heading" className={styles.heading}>Closer to your community.<br /><span>Focused on your needs.</span></h2><p className={styles.localIntro}>We welcome job, staffing and service enquiries from Raipur and other cities across Chhattisgarh. Tell us where you are and what you need so our team can discuss the options available locally.</p><div className={styles.cities}>{CHHATTISGARH_SERVICE_CITIES.map((city) => <span key={city}><MapPin size={12} />{city}</span>)}</div><Link href="/locations" className={styles.textLink}>Explore our coverage <ArrowRight size={16} /></Link></div>
        <aside className={styles.contactCard}><span className={styles.contactIcon}><MessageCircle size={25} /></span><h3>Let&apos;s start with a conversation.</h3><p>Not sure which service or route fits? Share your question with our team.</p><dl>{address && <div><dt><MapPin size={16} />Address</dt><dd>{address}</dd></div>}{settings.phone && <div><dt><Phone size={16} />Phone</dt><dd><a href={`tel:${settings.phone}`}>{settings.phone}</a></dd></div>}{settings.email && <div><dt><Mail size={16} />Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></div>}{settings.workingHours && <div><dt>Working hours</dt><dd>{settings.workingHours}</dd></div>}</dl><Link href="/contact" className="classic-button classic-button-blue">Get in Touch <ArrowRight size={17} /></Link></aside>
      </section>

      <section className={`classic-container ${styles.cta}`}><div><p>YOUR NEXT STEP STARTS HERE</p><h2>A new role. A stronger team.<br />A little more support.</h2><span>Whatever brings you here, we&apos;ll help you find where to begin.</span></div><div className={styles.ctaActions}><Link href="/jobs" className="classic-button classic-button-white">Find a Job <ArrowRight size={17} /></Link><Link href="/services/request" className={styles.orangeButton}>Request a Service <ArrowUpRight size={17} /></Link></div></section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/jobs">Find Jobs</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
