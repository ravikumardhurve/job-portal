import { SERVICE_IMAGES } from "@/lib/constants";

export const SERVICE_PAGE_SLUGS = ["job-placement", "security-services", "baby-care", "housekeeping", "pest-control"] as const;
export type ServicePageSlug = typeof SERVICE_PAGE_SLUGS[number];

export type ServicePageContent = {
  slug: ServicePageSlug;
  serviceType?: "SECURITY" | "BABY_CARE" | "HOUSEKEEPING" | "PEST_CONTROL";
  eyebrow: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  heroImage: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  highlights: Array<{ value: string; label: string }>;
  included: Array<{ title: string; text: string }>;
  process: string[];
  gallery: Array<{ src: string; caption: string }>;
  faqs: Array<{ question: string; answer: string }>;
  seoTitle: string;
  seoDescription: string;
  searchHeading: string;
  searchParagraphs: string[];
  localNeeds: string[];
  searchTerms: string[];
};

export const CHHATTISGARH_SERVICE_CITIES = ["Raipur", "Bhilai", "Durg", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Ambikapur", "Jagdalpur", "Dhamtari"] as const;

export const SERVICE_PAGES: Record<ServicePageSlug, ServicePageContent> = {
  "job-placement": {
    slug: "job-placement", eyebrow: "JOBS & MANPOWER", shortTitle: "Job Placement", title: "Local jobs and reliable manpower support.",
    summary: "Candidates ko suitable opportunities aur employers ko organised hiring support ek clear process mein.",
    description: "CG Job Care candidates, recruiters aur employers ko profile, vacancy, application, shortlist aur interview workflow se connect karta hai.",
    heroImage: SERVICE_IMAGES.jobPlacement, primaryHref: "/jobs", primaryLabel: "Explore jobs", secondaryHref: "/employer/requirement", secondaryLabel: "Hire staff",
    highlights: [{ value: "Live", label: "Published vacancies" }, { value: "Simple", label: "Candidate profile" }, { value: "Tracked", label: "Application status" }],
    included: [{ title: "Candidate registration", text: "Mobile-first profile with education, experience and job preference." }, { title: "Employer requirement", text: "Private manpower requirement before a vacancy is published." }, { title: "Interview coordination", text: "Shortlist, interview and joining updates in one workflow." }],
    process: ["Register or submit requirement", "Team reviews the information", "Matching and shortlisting", "Interview and joining coordination"],
    gallery: [],
    faqs: [{ question: "Candidate registration kaise hota hai?", answer: "Name, mobile, email aur location se account banayein, phir dashboard mein education, experience aur job preference complete karein." }, { question: "Employer vacancy public kab hoti hai?", answer: "Requirement review hone ke baad admin approved job ko publish karta hai." }, { question: "Raipur mein fresher jobs kaise search karein?", answer: "Jobs page par city, category, salary aur fresher filters use karke relevant openings dekhi ja sakti hain." }, { question: "Bhilai, Durg aur Bilaspur ki jobs bhi milengi?", answer: "Platform Chhattisgarh ke multiple cities ki approved vacancies list kar sakta hai. Live availability jobs page par city filter se check karein." }],
    seoTitle: "Jobs in Raipur & Chhattisgarh | Job Placement - CG Job Care",
    seoDescription: "Find jobs in Raipur, Bhilai, Durg, Bilaspur and across Chhattisgarh. Explore published vacancies, fresher jobs and local manpower support.",
    searchHeading: "Jobs in Raipur and across Chhattisgarh",
    searchParagraphs: ["CG Job Care par candidates Raipur jobs, fresher jobs, private jobs, security guard jobs, housekeeping jobs aur caretaker jobs ek organised process ke saath explore kar sakte hain. Har active vacancy mein location, salary range, employment type aur openings clearly dikhayi jaati hain.", "Employers Raipur, Bhilai, Durg, Bilaspur, Korba aur dusre Chhattisgarh cities ke liye manpower requirement privately submit kar sakte hain. Requirement review ke baad suitable recruitment workflow, shortlisting aur interview coordination start hota hai."],
    localNeeds: ["Fresher and experienced jobs", "Security guard and supervisor jobs", "Office, sales and support roles", "Housekeeping and caretaker jobs", "Local manpower recruitment"],
    searchTerms: ["jobs in Raipur", "jobs in Chhattisgarh", "fresher jobs Raipur", "manpower agency Raipur", "private jobs in Bhilai"],
  },
  "security-services": {
    slug: "security-services", serviceType: "SECURITY", eyebrow: "SECURITY SERVICES", shortTitle: "Security", title: "Security manpower for sites, offices and events.",
    summary: "Guard, lady guard, supervisor aur site security requirements ke liye local coordination.",
    description: "Requirement type, shift, location aur required headcount review karke security operations team appropriate manpower coordination karti hai.",
    heroImage: SERVICE_IMAGES.security, primaryHref: "/services/request?service=SECURITY", primaryLabel: "Request security", secondaryHref: "/contact", secondaryLabel: "Talk to our team",
    highlights: [{ value: "Day/Night", label: "Shift requests" }, { value: "Site", label: "Requirement review" }, { value: "Local", label: "Team coordination" }],
    included: [{ title: "Security guards", text: "Residential, commercial and industrial site requirements." }, { title: "Lady guards", text: "Female security staffing based on site requirement." }, { title: "Supervisors & events", text: "Team supervision and short-term event security support." }],
    process: ["Share site and shift details", "Requirement verification call", "Team and deployment planning", "Ongoing coordination"],
    gallery: [],
    faqs: [{ question: "Kitne guards request kar sakte hain?", answer: "Single guard se lekar complete security team ki requirement form mein share ki ja sakti hai." }, { question: "Night shift available hai?", answer: "Day, night aur rotational shift availability location aur requirement review ke baad confirm ki jaati hai." }, { question: "Security guard service kin properties ke liye hai?", answer: "Residential society, office, shop, warehouse, industrial site, event aur institution ki requirements submit ki ja sakti hain." }, { question: "Raipur ke bahar security service mil sakti hai?", answer: "Chhattisgarh ke major cities se request accept ki jaati hai. Staff availability aur deployment timeline verification call par confirm hoti hai." }],
    seoTitle: "Security Guard Services in Raipur & Chhattisgarh | CG Job Care",
    seoDescription: "Request security guards, lady guards and supervisors in Raipur, Bhilai, Durg, Bilaspur and major Chhattisgarh cities.",
    searchHeading: "Security guard services in Raipur and Chhattisgarh",
    searchParagraphs: ["Home, residential society, office, shop, warehouse, factory, school, hospital aur event ke liye security guard requirement share karein. CG Job Care ki security operations team site location, shift, headcount aur duty expectations samajhkar deployment coordination karti hai.", "Raipur ke saath Bhilai-Durg industrial belt, Bilaspur, Korba, Rajnandgaon, Raigarh aur other major Chhattisgarh cities se guard, lady guard aur security supervisor enquiries accept ki jaati hain. Final availability requirement verification ke baad confirm hoti hai."],
    localNeeds: ["Residential security guards", "Office and commercial security", "Industrial and warehouse guards", "Lady guards and supervisors", "Event security manpower"],
    searchTerms: ["security guard service Raipur", "security agency Chhattisgarh", "security guard Bhilai", "security guards Durg", "security service Bilaspur"],
  },
  "baby-care": {
    slug: "baby-care", serviceType: "BABY_CARE", eyebrow: "BABY CARE & CARETAKER", shortTitle: "Baby Care", title: "Dependable care support for your home.",
    summary: "Baby care, elder care, patient attendant aur caretaker requirements ke liye careful coordination.",
    description: "Family ki timing, care need, location aur experience preference samajhkar suitable caregiver requirement process ki jaati hai.",
    heroImage: SERVICE_IMAGES.care, primaryHref: "/services/request?service=BABY_CARE", primaryLabel: "Request baby care", secondaryHref: "/services/request?service=CARETAKER", secondaryLabel: "Request caretaker",
    highlights: [{ value: "Home", label: "Care requirements" }, { value: "Flexible", label: "Timing options" }, { value: "Human", label: "Local follow-up" }],
    included: [{ title: "Baby care", text: "Daily routine and family schedule based support." }, { title: "Elder care", text: "Non-medical daily assistance and companionship requirements." }, { title: "Patient attendant", text: "Home-based attendant coordination based on stated need." }],
    process: ["Tell us the care requirement", "Discuss timing and experience", "Profile coordination", "Start and follow-up"],
    gallery: [],
    faqs: [{ question: "Medical nurse bhi milti hai?", answer: "Current service caregiver aur attendant coordination ke liye hai. Clinical nursing requirement call par clearly batayein, kyunki medical care ke liye qualified professional zaroori hota hai." }, { question: "Part-time care possible hai?", answer: "Required timing form mein share karein; part-time, full-time ya live-in availability review ke baad confirm hoti hai." }, { question: "Baby caretaker select karte waqt kya details deni chahiye?", answer: "Child age, duty timing, location, preferred experience aur expected daily responsibilities clearly share karein." }, { question: "Elder care aur patient attendant bhi available hain?", answer: "Non-medical elder care, daily assistance aur patient attendant requirements submit ki ja sakti hain. Exact scope call par verify hota hai." }],
    seoTitle: "Baby Care & Caretaker Services in Raipur | CG Job Care",
    seoDescription: "Request baby care, caretaker, elder care and patient attendant support in Raipur and major cities across Chhattisgarh.",
    searchHeading: "Baby care and caretaker services in Raipur",
    searchParagraphs: ["Families baby care, nanny, elder care, patient attendant aur home caretaker ki requirement ek simple form se share kar sakti hain. Timing, family routine, care responsibilities, preferred experience aur location samajhne ke baad suitable coordination ki jaati hai.", "Raipur, Bhilai, Durg, Bilaspur, Korba aur other Chhattisgarh cities ke liye home-care enquiries accept hoti hain. Safety aur role clarity ke liye family ko duties, working hours aur kisi bhi medical need ko request mein clearly mention karna chahiye."],
    localNeeds: ["Baby care and nanny support", "Elder care assistance", "Patient attendant requirements", "Part-time or full-time caretaker", "Home-based daily support"],
    searchTerms: ["baby care service Raipur", "caretaker in Raipur", "patient attendant Chhattisgarh", "elder care Bhilai", "nanny service Bilaspur"],
  },
  housekeeping: {
    slug: "housekeeping", serviceType: "HOUSEKEEPING", eyebrow: "HOUSEKEEPING", shortTitle: "Housekeeping", title: "Reliable housekeeping for homes and workplaces.",
    summary: "Home, office, hotel aur commercial site ke liye individual staff ya team requirement.",
    description: "Area, frequency, shift aur staff count ke according housekeeping requirement operational team handle karti hai.",
    heroImage: SERVICE_IMAGES.housekeeping, primaryHref: "/services/request?service=HOUSEKEEPING", primaryLabel: "Request housekeeping", secondaryHref: "/contact", secondaryLabel: "Discuss requirement",
    highlights: [{ value: "Home", label: "Residential support" }, { value: "Office", label: "Commercial support" }, { value: "Team", label: "Staffing options" }],
    included: [{ title: "Residential support", text: "Regular home housekeeping requirements." }, { title: "Office housekeeping", text: "Workplace and common-area staff coordination." }, { title: "Facility teams", text: "Multi-person staffing for larger properties." }],
    process: ["Share property details", "Confirm schedule and scope", "Staff planning", "Service coordination"],
    gallery: [],
    faqs: [{ question: "Cleaning material kaun provide karta hai?", answer: "Equipment aur material arrangement property type aur scope ke according verification call par confirm hota hai." }, { question: "Daily staff mil sakta hai?", answer: "Daily, shift-based, part-time aur multi-person team requirements form mein share ki ja sakti hain." }, { question: "Office housekeeping ke liye team mil sakti hai?", answer: "Office, hotel, hospital, society aur commercial facility ke liye required headcount aur shifts submit kiye ja sakte hain." }, { question: "Raipur ke bahar housekeeping available hai?", answer: "Major Chhattisgarh cities se requests accept hoti hain. Exact staff availability location aur schedule review ke baad confirm hoti hai." }],
    seoTitle: "Housekeeping Services in Raipur & Chhattisgarh | CG Job Care",
    seoDescription: "Request housekeeping staff for homes, offices, hotels and commercial properties in Raipur and major Chhattisgarh cities.",
    searchHeading: "Housekeeping services in Raipur for home and business",
    searchParagraphs: ["CG Job Care homes, offices, hotels, hospitals, societies aur commercial properties ki housekeeping staffing requirements coordinate karta hai. Customer property type, duty hours, cleaning scope, frequency aur required staff count form mein share kar sakte hain.", "Raipur, Bhilai, Durg, Bilaspur, Korba, Raigarh aur other major Chhattisgarh cities ke liye individual housekeeper ya facility team request submit ki ja sakti hai. Staff schedule aur availability requirement review ke baad confirm hoti hai."],
    localNeeds: ["Home housekeeping staff", "Office cleaning staff", "Hotel and hospital housekeeping", "Society and facility teams", "Daily and shift-based manpower"],
    searchTerms: ["housekeeping service Raipur", "housekeeper in Raipur", "office cleaning staff Bhilai", "housekeeping agency Durg", "cleaning staff Bilaspur"],
  },
  "pest-control": {
    slug: "pest-control", serviceType: "PEST_CONTROL", eyebrow: "PEST CONTROL", shortTitle: "Pest Control", title: "Practical pest control for home and business.",
    summary: "Residential aur commercial spaces ke liye inspection-based pest treatment coordination.",
    description: "Property type, location aur pest concern share karne ke baad team treatment requirement aur next step coordinate karti hai.",
    heroImage: SERVICE_IMAGES.pestControl, primaryHref: "/services/request?service=PEST_CONTROL", primaryLabel: "Book pest control", secondaryHref: "/contact", secondaryLabel: "Ask a question",
    highlights: [{ value: "Home", label: "Residential" }, { value: "Office", label: "Commercial" }, { value: "Review", label: "Requirement first" }],
    included: [{ title: "General pest treatment", text: "Common household pest concerns and prevention." }, { title: "Commercial spaces", text: "Office, shop and facility treatment requirements." }, { title: "Follow-up planning", text: "Scope-based treatment and follow-up coordination." }],
    process: ["Describe pest concern", "Property and location review", "Treatment coordination", "Follow-up guidance"],
    gallery: [],
    faqs: [{ question: "Pest control ka price kaise decide hota hai?", answer: "Property size, pest type, affected area aur required treatment scope review hone ke baad estimate confirm hota hai." }, { question: "Home aur office dono ke liye service hai?", answer: "Haan, residential aur commercial pest control requests dono submit ki ja sakti hain." }, { question: "Kaun se pest concerns ke liye request bhej sakte hain?", answer: "Cockroach, termite, ant, mosquito, rodent aur general pest concerns form mein describe kiye ja sakte hain. Suitable treatment inspection ke baad decide hota hai." }, { question: "Raipur ke bahar pest control available hai?", answer: "Major Chhattisgarh cities se enquiries accept hoti hain. Technician availability aur service date location review ke baad confirm hoti hai." }],
    seoTitle: "Pest Control Services in Raipur & Chhattisgarh | CG Job Care",
    seoDescription: "Book pest control for homes, offices and commercial spaces in Raipur, Bhilai, Durg, Bilaspur and Chhattisgarh cities.",
    searchHeading: "Pest control services in Raipur for home and office",
    searchParagraphs: ["Cockroach, termite, ant, mosquito, rodent aur general pest problems ke liye residential ya commercial pest control request submit karein. Property type, approximate area, pest concern aur location review hone ke baad treatment scope aur scheduling coordinate ki jaati hai.", "Raipur ke saath Bhilai, Durg, Bilaspur, Korba, Rajnandgaon, Raigarh aur other Chhattisgarh cities se pest management enquiries accept ki jaati hain. Treatment method, estimated cost aur follow-up requirement inspection ya verification ke baad confirm hoti hai."],
    localNeeds: ["Home pest control", "Office and shop treatment", "Termite inspection requests", "Cockroach and general pest treatment", "Commercial property pest management"],
    searchTerms: ["pest control Raipur", "pest control service Chhattisgarh", "termite treatment Raipur", "pest control Bhilai", "pest control Bilaspur"],
  },
};

export function isServicePageSlug(value: string): value is ServicePageSlug {
  return SERVICE_PAGE_SLUGS.includes(value as ServicePageSlug);
}
