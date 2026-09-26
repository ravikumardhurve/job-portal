import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Building2, Check, Clock3, HeartHandshake, Mail, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { portalStore } from "@/lib/portal";
import styles from "./contact.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = `Contact ${settings.companyName} | Jobs & Service Enquiries`;
  const description = `Get in touch with ${settings.companyName} for job enquiries, staff hiring, security, care, housekeeping and pest control support across Chhattisgarh.`;
  return { title, description, alternates: { canonical: "/contact" }, openGraph: { title, description, url: "/contact", type: "website", locale: "en_IN", siteName: settings.companyName } };
}

const enquiryPaths = [
  { icon: BriefcaseBusiness, tone: "blue", title: "I'm looking for a job", text: "Browse roles, check salary and location details, and apply through your candidate account.", href: "/jobs", action: "Explore jobs", secondaryHref: "/candidate/register", secondaryLabel: "Create a candidate profile" },
  { icon: Building2, tone: "orange", title: "I need to hire staff", text: "Share your company, role, location and required team size with our recruitment team.", href: "/employer/requirement", action: "Send a hiring requirement", secondaryHref: "/services/job-placement", secondaryLabel: "Learn about recruitment" },
  { icon: HeartHandshake, tone: "purple", title: "I need a service", text: "Tell us about your security, care, housekeeping or pest control requirement.", href: "/services/request", action: "Request a service", secondaryHref: "/services", secondaryLabel: "Explore all services" },
] as const;

const faqs = [
  { question: "What should I include in my enquiry?", answer: "Start with your city and what you need. For hiring, include the role and number of staff. For a service, include the property or care requirement and preferred schedule. Avoid sharing identity documents or sensitive personal information in an initial message." },
  { question: "Can I apply for a job from here?", answer: "Use the Find Jobs page to see published vacancies and open a role for its details. Sign in or create a candidate account to apply and follow your application updates." },
  { question: "Does submitting a request confirm a booking?", answer: "No. A request starts the conversation. The team reviews your location and requirements, then confirms availability, scope, charges and the next steps before you proceed." },
  { question: "Can I enquire from outside Raipur?", answer: "Yes, enquiries are accepted from cities across Chhattisgarh. Job openings and service availability vary by location, so include your city when you get in touch." },
] as const;

function publicWebUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export default async function ContactPage() {
  const settings = await portalStore.getSiteSettings();
  const whatsappNumber = settings.whatsapp?.replace(/[^0-9]/g, "");
  const businessUrl = publicWebUrl(settings.googleBusinessProfileUrl);
  const location = [settings.address, settings.city, settings.state].filter(Boolean).join(", ");
  const contacts = [
    ...(settings.phone ? [{ icon: Phone, tone: "blue", title: "Give us a call", detail: settings.phone, note: settings.workingHours || "Discuss your question with our team.", href: `tel:${settings.phone}`, external: false, action: "Call now" }] : []),
    ...(whatsappNumber ? [{ icon: MessageCircle, tone: "orange", title: "Start a WhatsApp chat", detail: "A little detail goes a long way.", note: "Share your city and what you need.", href: `https://wa.me/${whatsappNumber}`, external: true, action: "Open WhatsApp" }] : []),
    ...(settings.email ? [{ icon: Mail, tone: "purple", title: "Write to us", detail: settings.email, note: "For detailed questions and requirements.", href: `mailto:${settings.email}`, external: false, action: "Send an email" }] : []),
  ];

  return (
    <main className={`classic-page ${styles.page}`}>
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="contact-heading">
        <div className="classic-container">
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Contact</span></nav>
          <div className={styles.heroGrid}>
            <div><p className="classic-eyebrow">LET&apos;S START A CONVERSATION</p><h1 id="contact-heading">A question?<br /><span>A requirement?</span><br /><em>We&apos;re listening.</em></h1><p className={styles.intro}>A new job, the right staff or a little everyday support—tell {settings.companyName} what you need. We&apos;ll help you find the right next step.</p><a href="#enquiry-options" className="classic-button classic-button-blue">Choose Your Enquiry <ArrowRight size={17} /></a></div>
            <aside className={styles.startCard}><span className={styles.startIcon}><MessageCircle size={28} /></span><p>NOT SURE WHERE TO BEGIN?</p><h2>Start with your city.<br />Tell us your need.</h2><ul><li><Check size={16} />The job, staff or service you need</li><li><Check size={16} />Your location and preferred schedule</li><li><Check size={16} />The best way to reach you</li></ul><span className={styles.startNote}>Please don&apos;t share passwords, OTPs or identity documents in an initial enquiry.</span></aside>
          </div>
        </div>
      </section>

      <section className={`classic-container ${styles.contactSection}`} aria-labelledby="reach-heading">
        <div className={styles.sectionHeading}><div><p className="classic-eyebrow">GET IN TOUCH</p><h2 id="reach-heading" className={styles.heading}>A convenient way to connect.</h2></div><p>Choose a contact option or use the relevant enquiry form below.</p></div>
        {contacts.length > 0 ? <div className={styles.contactGrid}>{contacts.map(({ icon: Icon, tone, title, detail, note, href, external, action }) => <a key={title} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={styles[tone]}><span className={styles.contactIcon}><Icon size={23} /></span><h3>{title}</h3><strong>{detail}</strong><p>{note}</p><span className={styles.contactAction}>{action}<ArrowUpRight size={16} />{external && <span className={styles.srOnly}> (opens in a new tab)</span>}</span></a>)}</div> : <div className={styles.emptyContact}><MessageCircle size={24} /><div><h3>Our direct contact details are being updated.</h3><p>You can still send a staffing or service requirement using the forms below, or browse current jobs.</p><a href="#enquiry-options">Choose an enquiry option <ArrowRight size={15} /></a></div></div>}
      </section>

      <section id="enquiry-options" className={styles.enquirySection} aria-labelledby="enquiry-heading"><div className="classic-container"><div className={styles.sectionHeading}><div><p className="classic-eyebrow">THE RIGHT PLACE TO START</p><h2 id="enquiry-heading" className={styles.heading}>What can we help you with?</h2></div><p>Each enquiry has its own route, so your details reach the relevant team.</p></div><div className={styles.enquiryGrid}>{enquiryPaths.map(({ icon: Icon, tone, title, text, href, action, secondaryHref, secondaryLabel }, index) => <article key={title} className={styles[tone]}><div className={styles.enquiryTop}><span className={styles.contactIcon}><Icon size={24} /></span><span>{String(index + 1).padStart(2, "0")}</span></div><h3>{title}</h3><p>{text}</p><div className={styles.enquiryActions}><Link href={href}>{action}<ArrowRight size={16} /></Link><Link href={secondaryHref}>{secondaryLabel}<ArrowUpRight size={14} /></Link></div></article>)}</div></div></section>

      <section className={`classic-container ${styles.localSection}`} aria-labelledby="local-heading">
        <div className={styles.localCopy}><p className="classic-eyebrow">LOCAL SUPPORT</p><h2 id="local-heading" className={styles.heading}>Closer to your needs.<br /><span>Clear on the next step.</span></h2><p>We welcome enquiries from Raipur and across Chhattisgarh. Share your location so we can discuss the opportunities and support available in your area.</p><Link href="/locations" className={styles.textLink}>Explore service coverage <ArrowRight size={16} /></Link><div className={styles.nextSteps}><h3>After you send a requirement</h3><ol><li><span>01</span>Your details are reviewed by the relevant team.</li><li><span>02</span>Missing information or preferences are clarified.</li><li><span>03</span>Availability and next steps are discussed with you.</li></ol></div></div>
        <aside className={styles.locationCard}><span className={styles.locationIcon}><MapPin size={27} /></span><p className={styles.cardEyebrow}>CONTACT INFORMATION</p><h3>{settings.companyName}</h3><dl>{location ? <div><dt><MapPin size={16} />{settings.address ? "Address" : "Location"}</dt><dd>{location}</dd></div> : <div><dt>Service area</dt><dd>Raipur &amp; Chhattisgarh</dd></div>}{settings.workingHours && <div><dt><Clock3 size={16} />Working hours</dt><dd>{settings.workingHours}</dd></div>}</dl>{businessUrl ? <a href={businessUrl} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>View our Google profile <ArrowUpRight size={17} /><span className={styles.srOnly}> (opens in a new tab)</span></a> : <Link href="/locations" className={styles.mapLink}>View our coverage <ArrowUpRight size={17} /></Link>}<p className={styles.visitNote}>{settings.address ? "Please confirm the location and a suitable time with our team before planning a visit." : "Exact service availability is confirmed after reviewing your location and requirement."}</p></aside>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-heading"><div className={`classic-container ${styles.faqGrid}`}><div><p className="classic-eyebrow">BEFORE YOU GET IN TOUCH</p><h2 id="faq-heading" className={styles.heading}>A few helpful answers.</h2><p className={styles.faqIntro}>A little clarity can make your first conversation easier.</p></div><div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary><span>{faq.question}</span><Plus size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></div></section>
      <section className={`classic-container ${styles.cta}`}><div><p>LET&apos;S TAKE THE NEXT STEP</p><h2>Your requirement.<br />Our starting point.</h2><span>Send the details through the right form, and let&apos;s begin.</span></div><div className={styles.ctaActions}><Link href="/services/request" className="classic-button classic-button-white">Request a Service <ArrowRight size={17} /></Link><Link href="/employer/requirement" className={styles.hireLink}>Hire Staff <ArrowUpRight size={16} /></Link></div></section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/jobs">Find Jobs</Link><Link href="/services">Services</Link><Link href="/about">About Us</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
