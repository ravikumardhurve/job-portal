import { POST as submitEmployerRequirement } from "@/app/api/employer-requirements/route";
import { POST as submitServiceReview } from "@/app/api/service-reviews/route";
import { portalStore, type SiteSettings } from "@/lib/portal";
import { CHHATTISGARH_SERVICE_CITIES, SERVICE_PAGES, SERVICE_PAGE_SLUGS, isServicePageSlug, type ServicePageSlug } from "@/lib/service-pages";
import { resolveServiceImages } from "@/lib/site-images";
import { jobView, MobileError, numberField, readBody, textField } from "./contracts";

// Public contract: never serialize an entire settings, job, review or requirement record.
// The mobile dispatcher calls this before authenticate; its CORS/error wrapper still applies.
type Section = { title: string; paragraphs: string[] };
type Document = { eyebrow: string; title: string; description: string; sections: Section[]; faqs?: { question: string; answer: string }[]; updatedAt?: string };
const section = (title: string, ...paragraphs: string[]): Section => ({ title, paragraphs });

function publicSettings(s: SiteSettings) {
  return {
    companyName: s.companyName, tagline: s.tagline, phone: s.phone, whatsapp: s.whatsapp,
    email: s.email, address: s.address, city: s.city, state: s.state, workingHours: s.workingHours,
    googleBusinessProfileUrl: webUrl(s.googleBusinessProfileUrl),
    homeAnnouncementText: s.homeAnnouncementText,
    homeHeroBadge: s.homeHeroBadge || "Jobs & trusted services in one place",
    homeHeroTitle: s.homeHeroTitle || "Find work.", homeHeroHighlight: s.homeHeroHighlight || "Find trusted",
    homeHeroDescription: s.homeHeroDescription || "From finding your next job to hiring reliable professionals for your home and business — everything you need is now in one place.",
    homeServicesTitle: s.homeServicesTitle || "One platform. Many everyday needs.",
    homeServicesDescription: s.homeServicesDescription || "Whether you need a job, a security guard, professional cleaning, pest control or someone you can trust to care for your family — start here.",
    homeJobsTitle: s.homeJobsTitle || "Looking for your next job?",
    homeJobsDescription: s.homeJobsDescription || "Browse opportunities across security, housekeeping, care and facility services. Apply directly through our platform.",
    homeCtaTitle: s.homeCtaTitle || "Need someone you can trust?",
    homeCtaDescription: s.homeCtaDescription || "Tell us what service you need. Our platform helps connect you with the right professional for your requirement.",
  };
}

function webUrl(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

// These pages currently keep their copy in JSX. Mirror it here until a shared
// website content module is introduced; service copy already has a shared source.
function documents(s: SiteSettings): Record<string, Document> {
  return {
    about: {
      eyebrow: "LOCAL PEOPLE. PRACTICAL SUPPORT.", title: "Good work. Genuine care. Everyday support.",
      description: `We're ${s.companyName}. We bring job discovery, recruitment coordination and everyday services together—helping people take their next step with more clarity and less confusion.`,
      sections: [
        section("Behind every requirement, there's a person.", "A job can mean a fresh start. The right staff can help a business run smoothly. A little support at home can give a family room to focus on what matters.", `That is the idea behind ${s.companyName}: make it easier to discover opportunities, explain what you need and reach the right support. We connect these everyday needs through dedicated job and service journeys, with local coordination at the centre.`, "We believe a useful platform should do more than show a listing. It should help you understand your options and know what happens next."),
        section("A clearer path to your next role.", "Explore published openings with salary and location details. Build your profile, apply to relevant roles and follow application updates from your dashboard."),
        section("People who fit your requirements.", "Tell us the role, location, shifts and team size you need. Your requirement is reviewed before moving into vacancy publishing, shortlisting and interview coordination."),
        section("Support for the everyday.", "From security and housekeeping to care and pest control, share what you need in one place. Our team reviews the scope, schedule and local availability with you."),
        section("Make the next step a little easier.", "Our mission is to make local opportunities and practical support easier to access—with clear information, thoughtful coordination and respect for the people on both sides."),
        section("Clarity before commitment", "Understand the role or service scope, location and next steps before you decide. Ask questions whenever something is unclear."),
        section("People before paperwork", "A profile or request is only the starting point. Skills, family routines, working hours and practical needs all deserve attention."),
        section("A considered process", "Requirement review, relevant details and coordination help both sides make informed decisions. Availability is confirmed, not assumed."),
        section("Respect in every interaction", "Our aim is a helpful, respectful experience for candidates, workers, families and employers, from the first enquiry to the next step."),
        section("Listen. Understand. Coordinate.", "Start with your need: Search a role or share a service or staffing requirement, along with your location and preferences.", "Get the details right: Profiles and requirements are reviewed so the relevant team can understand the scope and coordinate next steps.", "Move forward with clarity: Discuss the opportunity, interview or service arrangements. Confirm details before proceeding.", "Job selection rests with the employer. Service scope, availability and charges are confirmed after reviewing your requirement."),
        section("Closer to your community. Focused on your needs.", "We welcome job, staffing and service enquiries from Raipur and other cities across Chhattisgarh. Tell us where you are and what you need so our team can discuss the options available locally."),
      ],
    },
    contact: {
      eyebrow: "LET'S START A CONVERSATION", title: "A question? A requirement? We're listening.",
      description: `A new job, the right staff or a little everyday support—tell ${s.companyName} what you need. We'll help you find the right next step.`,
      sections: [section("Start with your city. Tell us your need.", "The job, staff or service you need. Your location and preferred schedule. The best way to reach you.", "Please don't share passwords, OTPs or identity documents in an initial enquiry."), section("After you send a requirement", "Your details are reviewed by the relevant team.", "Missing information or preferences are clarified.", "Availability and next steps are discussed with you.")],
      faqs: [
        { question: "What should I include in my enquiry?", answer: "Start with your city and what you need. For hiring, include the role and number of staff. For a service, include the property or care requirement and preferred schedule. Avoid sharing identity documents or sensitive personal information in an initial message." },
        { question: "Can I apply for a job from here?", answer: "Use the Find Jobs page to see published vacancies and open a role for its details. Sign in or create a candidate account to apply and follow your application updates." },
        { question: "Does submitting a request confirm a booking?", answer: "No. A request starts the conversation. The team reviews your location and requirements, then confirms availability, scope, charges and the next steps before you proceed." },
        { question: "Can I enquire from outside Raipur?", answer: "Yes, enquiries are accepted from cities across Chhattisgarh. Job openings and service availability vary by location, so include your city when you get in touch." },
      ],
    },
    locations: {
      eyebrow: "ROOTED IN CHHATTISGARH", title: "Your city. Your next possibility.",
      description: `Find work closer to home. Find support for the people and places that matter. Explore jobs and share your service needs with ${s.companyName}, city by city.`,
      sections: [section("A note on availability.", "These are enquiry locations, not a list of offices. Jobs, staff and services vary by city. Your exact locality, requirements and schedule are reviewed before availability is confirmed."), section("Your locality matters", "Your city, locality and a nearby landmark. The service or staff you are looking for. Your preferred start date and schedule."), section("Don't see your location?", "A nearby town, a new locality or a workplace outside the city—share the details. We'll review your request and discuss what may be possible.", "Submitting an enquiry does not confirm a booking.")],
      faqs: [
        { question: "Does every listed city have an office?", answer: "No. This directory lists cities for job searches and service enquiries, not branch offices. For our published contact details and location, visit the Contact page and confirm before planning a visit." },
        { question: "What if there are no jobs in my city?", answer: "Published vacancies change over time. Try nearby cities or browse all jobs. You can also create a candidate profile with your location and work preferences; registration does not guarantee a job." },
        { question: "Can I request a service in a nearby town or village?", answer: "Yes. Share your actual city or town, locality and requirements in the service request form. Our team will review the location and confirm whether the requested support can be arranged." },
      ],
    },
    "privacy-policy": {
      eyebrow: "LEGAL & PRIVACY", title: "Privacy Policy", description: "How we collect, use, protect and delete candidate and customer information.", updatedAt: "21 September 2026",
      sections: [
        section("1. Who we are", `${s.companyName} provides recruitment coordination, job application support and facility-service enquiry management in Chhattisgarh. Questions about this policy can be submitted through our contact page${s.email ? ` or emailed to ${s.email}` : ""}${s.phone ? `. You may also call ${s.phone}` : ""}.`),
        section("2. Information we collect", "Candidate account details may include name, mobile number, email, location, address, education, experience, job preference and application activity. When voluntarily uploaded, documents may include a resume, photograph, Aadhaar, PAN, qualification, experience or police-verification records. Employer and service forms collect contact and requirement details."),
        section("3. Why we use information", "We use information to create and secure accounts, match candidates with suitable jobs, process applications, coordinate interviews, verify documents, respond to service requests, prevent misuse and maintain operational records. We do not use identity documents for unrelated advertising."),
        section("4. Candidate documents", "Candidate documents are optional unless a specific job or verification stage requires them. They are stored as authenticated private assets. Access is limited to the candidate and authorized administrators through short-lived signed links, and document access is logged. Candidates can replace or delete individual documents from their profile."),
        section("5. Sharing", "Relevant profile or application information may be shared with an employer or service partner when required for a candidate’s application, interview, verification or placement. Infrastructure providers such as hosting, database and media-storage services process data only to operate the platform. We may disclose information where legally required."),
        section("6. Retention", "Active account information is retained while recruitment or placement support is being provided. Candidate accounts and documents are scheduled for a retention review after 24 months and may be retained longer when the account remains active, an application is ongoing, fraud prevention is required or law requires a record. Completed deletion requests remove the candidate profile and private documents; limited transaction records may remain without an accessible candidate profile where required for legitimate records."),
        section("7. Your choices and rights", "Candidates can review and update their profile, download a structured copy of their information, delete individual documents, withdraw from document processing by deleting documents, and submit or cancel an account deletion request from the Privacy & Data section. Requests may require identity verification before completion."),
        section("8. Security", "We use password hashing, signed sessions, role-based access, private document delivery, file type and size restrictions, database access controls and audit logs. No online service can promise absolute security; suspected misuse should be reported promptly using the contact details above."),
        section("9. Age requirement", "Candidate accounts are intended for people aged 18 years or older. Please contact us instead of registering if you are under 18."),
        section("10. Updates", "Material policy changes will be reflected by a new effective date and, where appropriate, an in-product notice or renewed consent."),
      ],
    },
    terms: {
      eyebrow: "PLATFORM TERMS", title: "Terms and Conditions", description: "Terms for using our recruitment and facility-service platform.", updatedAt: "21 September 2026",
      sections: [
        section("1. Platform purpose", `${s.companyName} helps candidates discover opportunities and enables employers and customers to submit recruitment or facility-service requirements. The platform coordinates information and workflows; it does not guarantee selection, employment, staff availability or a specific service outcome.`),
        section("2. Candidate accounts", "Candidates must be at least 18 years old and provide accurate, current information. Account credentials must be kept confidential. Impersonation, forged documents, duplicate accounts and unauthorized use are prohibited."),
        section("3. Jobs and applications", "Job information may be supplied by employers or administrators and can change or close. Candidates should independently confirm role, salary, location, duties and employer details before joining. Applying does not guarantee an interview or placement."),
        section("4. Documents", "Candidates may upload only documents they are authorized to use. Documents must be accurate and free from harmful content. Uploaded identity and qualification documents are handled according to the Privacy Policy."),
        section("5. Fair use", "Users must not attack the platform, scrape private data, bypass access controls, upload malware, submit unlawful content or misuse another person’s information. Accounts may be blocked where fraud, safety or misuse is suspected."),
        section("6. Fees and third parties", "Any recruitment or service fee must be clearly communicated separately. External employers, service partners, communication providers and hosting services may have their own terms. Never make an unverified payment based only on an online message."),
        section("7. Availability and changes", "We may update, suspend or discontinue features for maintenance, security or business requirements. We aim to keep information available but do not promise uninterrupted service."),
        section("8. Contact and complaints", `Questions, corrections or complaints can be submitted through our contact page${s.email ? ` or emailed to ${s.email}` : ""}${s.address ? `. Written correspondence may be addressed to ${s.address}` : ""}.`),
      ],
    },
  };
}

const cityDescriptions: Record<typeof CHHATTISGARH_SERVICE_CITIES[number], string> = {
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

function serviceSummary(slug: ServicePageSlug, s: SiteSettings) {
  const c = SERVICE_PAGES[slug];
  const titles: Record<ServicePageSlug, string> = { "security-services": "Security Guard Services", "pest-control": "Pest Control", "baby-care": "Baby Care & Caretaker", housekeeping: "Housekeeping", "job-placement": "Jobs & Recruitment" };
  return { slug, shortTitle: titles[slug], summary: c.summary.replaceAll("CG Job Care", s.companyName), serviceType: c.serviceType };
}

async function content() {
  const s = await portalStore.getSiteSettings();
  return {
    settings: publicSettings(s), documents: documents(s),
    cities: CHHATTISGARH_SERVICE_CITIES.map(name => ({ name, description: cityDescriptions[name] })),
    services: SERVICE_PAGE_SLUGS.map(slug => serviceSummary(slug, s)),
  };
}

async function serviceDetail(slug: ServicePageSlug) {
  const [settings, reviews] = await Promise.all([portalStore.getSiteSettings(), portalStore.listApprovedServiceReviews(slug)]);
  const c = SERVICE_PAGES[slug];
  const images = await resolveServiceImages(settings, slug);
  const brand = (text: string) => text.replaceAll("CG Job Care", settings.companyName);
  return {
    ...serviceSummary(slug, settings), eyebrow: c.eyebrow, title: c.title, description: brand(c.description),
    heroImage: images.heroImage, gallery: images.gallery,
    primaryHref: c.primaryHref, primaryLabel: c.primaryLabel, secondaryHref: c.secondaryHref, secondaryLabel: c.secondaryLabel,
    highlights: c.highlights, included: c.included, process: c.process,
    searchHeading: c.searchHeading, searchParagraphs: c.searchParagraphs.map(brand), localNeeds: c.localNeeds,
    faqs: c.faqs.map(f => ({ question: f.question, answer: brand(f.answer) })),
    reviews: reviews.map(r => ({ id: r.id, customerName: r.customerName, city: r.city, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
  };
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...headers } });
}

// Forward validated, allowlisted input through the existing web route so review
// moderation and employer requirement creation continue to share the same rules.
function submissionRequest(request: Request, body: Record<string, unknown>) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("Content-Length");
  return new Request(request.url, { method: "POST", headers, body: JSON.stringify(body) });
}

async function employer(request: Request) {
  const body = await readBody(request);
  const candidatesRequired = numberField(body, "candidatesRequired", 1);
  if (!Number.isSafeInteger(candidatesRequired)) throw new MobileError("Candidates required must be a positive whole number.");
  const fields = {
    company: textField(body, "company"), contactName: textField(body, "contactName"), mobile: textField(body, "mobile", 1, 30),
    jobTitle: textField(body, "jobTitle"), category: textField(body, "category"), city: textField(body, "city", 1, 100), candidatesRequired,
    ...(body.contactEmail !== undefined && body.contactEmail !== "" ? { contactEmail: textField(body, "contactEmail", 1, 254) } : {}),
  };
  const response = await submitEmployerRequirement(submissionRequest(request, fields));
  if (!response.ok) return response;
  const result = await response.json() as { data: { id: string }; message: string };
  return json({ data: { id: result.data.id }, message: result.message }, response.status);
}

async function review(request: Request) {
  const body = await readBody(request);
  const fields = {
    serviceSlug: textField(body, "serviceSlug"), customerName: textField(body, "customerName", 2, 80),
    comment: textField(body, "comment", 15, 1000), rating: numberField(body, "rating", 1),
    ...(body.city !== undefined && body.city !== "" ? { city: textField(body, "city", 1, 80) } : {}),
  };
  return submitServiceReview(submissionRequest(request, fields));
}

/** GET public/content, public/home, public/services, public/services/:slug;
 * POST public/employer, public/reviews. Null means outside the public namespace.
 */
export async function publicPages(request: Request, path: string[]): Promise<Response | null> {
  if (path[0] !== "public") return null;
  const route = path.slice(1).join("/");
  const readRoute = ["content", "home", "services"].includes(route) || path.length === 3 && path[1] === "services";
  const writeRoute = ["employer", "reviews"].includes(route);
  if (!readRoute && !writeRoute) return json({ error: "Public page not found." }, 404);
  const method = writeRoute ? "POST" : "GET";
  if (request.method !== method) return json({ error: "Method not allowed." }, 405, { Allow: method });
  try {
    if (route === "employer") return await employer(request);
    if (route === "reviews") return await review(request);
    if (route === "content") return json({ data: await content() });
    if (route === "home") {
      const [landing, categories] = await Promise.all([portalStore.getPublicLanding(), portalStore.listJobCategoryCounts()]);
      const { activeJobs, candidateCount, employerCount, serviceClientCount } = landing.stats;
      return json({ data: { jobs: landing.jobs.map(jobView), stats: { activeJobs, candidateCount, employerCount, serviceClientCount }, categories: categories.map(c => ({ category: c.category, count: c.count })) } });
    }
    if (route === "services") {
      const settings = await portalStore.getSiteSettings();
      return json({ data: SERVICE_PAGE_SLUGS.map(slug => serviceSummary(slug, settings)) });
    }
    if (!isServicePageSlug(path[2])) return json({ error: "Service not found." }, 404);
    return json({ data: await serviceDetail(path[2]) });
  } catch (error) {
    if (error instanceof MobileError) return json({ error: error.message }, error.status);
    // Store failures go through the dispatcher's existing sanitized error handler.
    throw error;
  }
}
