import type { AdminScope, BusinessVertical } from "@/lib/admin-scope";
import { inferBusinessVertical, jobScopeFilter, requirementScopeFilter, serviceTypesForScope } from "@/lib/admin-scope";

export type JobStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "PAUSED" | "CLOSED" | "FILLED" | "EXPIRED" | "ARCHIVED";
export type ApplicationStatus = "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "SELECTED" | "JOINING_SCHEDULED" | "JOINED" | "REJECTED" | "WITHDRAWN";
export type LeadStatus = "NEW" | "CONTACTED" | "VERIFIED" | "APPROVED" | "RECRUITING" | "FILLED" | "CLOSED" | "REJECTED" | "ON_HOLD";

export interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  businessVertical?: BusinessVertical;
  city: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY";
  vacancies: number;
  status: JobStatus;
  urgent: boolean;
  postedAt: string;
  description?: string;
  jobRole?: string;
  qualification?: string;
  minExperience?: number;
  maxExperience?: number;
  shift?: "DAY" | "NIGHT" | "ROTATIONAL";
  applicationDeadline?: string;
  benefits?: string[];
  updatedAt?: string;
  archivedAt?: string;
  duplicatedFrom?: string;
}

export interface JobSearchFilters {
  q?: string;
  city?: string;
  category?: string;
  employmentType?: Job["employmentType"];
  shift?: Job["shift"];
  qualification?: string;
  fresherOnly?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  sort?: "latest" | "salary_high" | "salary_low";
  page?: number;
  pageSize?: number;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  statusHistory: Array<{ status: ApplicationStatus; at: string }>;
  appliedAt: string;
}

export interface Address {
  line1?: string;
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
}

export interface JobPreference {
  category?: string;
  role?: string;
  location?: string;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  jobType?: Job["employmentType"];
  shift?: Job["shift"];
  immediateJoining?: boolean;
}

export interface Candidate {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  preferredRole?: string;
  city?: string;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED";
  availability?: "AVAILABLE" | "INTERVIEWING" | "SELECTED" | "WORKING" | "NOT_AVAILABLE";
  passwordHash?: string;
  profileCompletion?: number;
  resumeUploaded?: boolean;
  identityDocumentsUploaded?: boolean;
  experienceType?: "FRESHER" | "EXPERIENCED";
  totalExperienceYears?: number;
  highestQualification?: string;
  currentAddress?: Address;
  permanentAddress?: Address & { sameAsCurrent?: boolean };
  jobPreference?: JobPreference;
  consents?: {
    privacyPolicyVersion: string;
    privacyAcceptedAt: string;
    termsVersion: string;
    termsAcceptedAt: string;
    documentProcessingVersion?: string;
    documentProcessingAcceptedAt?: string;
  };
  retentionReviewAt?: string;
  deletionRequestedAt?: string;
  blockReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CandidateEducation {
  candidateId: string;
  qualification: string;
  course?: string;
  specialization?: string;
  institution?: string;
  passingYear?: string;
  percentage?: string;
  createdAt: string;
}

export interface CandidateExperience {
  candidateId: string;
  company?: string;
  jobRole?: string;
  salary?: string;
  startDate?: string;
  endDate?: string;
  responsibilities?: string;
  createdAt: string;
}

export type CandidateDocumentType = "RESUME" | "AADHAAR_FRONT" | "AADHAAR_BACK" | "PAN" | "PHOTO" | "POLICE_VERIFICATION" | "EXPERIENCE_CERTIFICATE" | "EDUCATION_CERTIFICATE" | "OTHER";

export interface CandidateDocument {
  candidateId: string;
  type: CandidateDocumentType;
  storageKey: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  consentVersion?: string;
  consentAcceptedAt?: string;
  retentionReviewAt?: string;
  updatedAt?: string;
  createdAt: string;
}

export type CandidatePrivacyRequestStatus = "SUBMITTED" | "IN_REVIEW" | "COMPLETED" | "REJECTED" | "CANCELLED";

export interface CandidatePrivacyRequest {
  id: string;
  candidateId: string;
  type: "DATA_DELETION";
  status: CandidatePrivacyRequestStatus;
  reason?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminCandidateDetails {
  candidate: Candidate;
  education: CandidateEducation | null;
  experience: CandidateExperience | null;
  documents: Array<Omit<CandidateDocument, "storageKey">>;
  applications: Array<Application & { job?: Job }>;
  interviews: Array<Interview & { job?: Job }>;
}

export interface SavedJob {
  candidateId: string;
  jobId: string;
  createdAt: string;
}

export interface NotificationRead {
  candidateId: string;
  notificationId: string;
  readAt: string;
}

export interface SiteSettings {
  companyName: string;
  tagline?: string;
  logoKey?: string;
  faviconKey?: string;
  heroBannerKeys?: string[];
  serviceAssets?: Record<string, { heroKey?: string; galleryKeys?: string[] }>;
  homeAnnouncementText?: string;
  homeHeroBadge?: string;
  homeHeroTitle?: string;
  homeHeroHighlight?: string;
  homeHeroDescription?: string;
  homeServicesTitle?: string;
  homeServicesDescription?: string;
  homeJobsTitle?: string;
  homeJobsDescription?: string;
  homeCtaTitle?: string;
  homeCtaDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  workingHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleBusinessProfileUrl?: string;
  gstNumber?: string;
}

const defaultSiteSettings: SiteSettings = {
  companyName: "CG Job Care",
  tagline: "Facility Services",
  metaTitle: "CG Job Care & Facility Services | Raipur",
  metaDescription: "Job placement, recruitment and facility services in Raipur and across Chhattisgarh.",
  homeAnnouncementText: "Raipur aur Chhattisgarh ke liye trusted jobs aur facility support",
  homeHeroBadge: "RAIPUR · CHHATTISGARH",
  homeHeroTitle: "Naukri ho ya trusted service,",
  homeHeroHighlight: "sahi madad ek jagah.",
  homeHeroDescription: "Jobs, manpower, security guards, baby care, housekeeping aur pest control—clear process aur local support ke saath.",
  homeServicesTitle: "Five services, clearly separated.",
  homeServicesDescription: "Har service ki dedicated team aur request flow hai, isliye aapki enquiry sahi department tak jaati hai.",
  homeJobsTitle: "Latest jobs in Chhattisgarh",
  homeJobsDescription: "Salary, location aur vacancy details dekhkar apne profile se apply karein.",
  homeCtaTitle: "Aaj hi apni requirement share karein.",
  homeCtaDescription: "Candidate registration simple hai. Employers aur customers apni requirement directly operational team ko bhej sakte hain.",
};

const placeholderContactValues = new Set(["+919999999999", "9999999999", "support@cgjobcare.com", "Raipur, Chhattisgarh", "Mon-Sat, 9:30 AM - 6:30 PM"]);

function withoutPlaceholderContactDetails(settings: SiteSettings): SiteSettings {
  const cleaned = { ...settings };
  for (const key of ["phone", "whatsapp", "email", "address", "workingHours"] as const) {
    const value = cleaned[key]?.trim();
    if (!value || placeholderContactValues.has(value)) delete cleaned[key];
  }
  return cleaned;
}

export interface EmployerRequirement {
  id: string;
  company: string;
  contactName: string;
  mobile: string;
  contactEmail?: string;
  jobTitle: string;
  category: string;
  businessVertical?: BusinessVertical;
  candidatesRequired: number;
  city: string;
  status: LeadStatus;
  assignedTo?: string;
  internalNotes?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  mobile: string;
  serviceType: "SECURITY" | "BABY_CARE" | "CARETAKER" | "HOUSEKEEPING" | "PEST_CONTROL" | "MANPOWER" | "OTHER";
  city: string;
  address: string;
  staffRequired?: number;
  status: "NEW" | "CONTACTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedStaff?: string;
  assignedVendor?: string;
  scheduledAt?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  link?: string;
  active: boolean;
  createdAt: string;
}

export interface WebsitePost {
  id: string;
  title: string;
  excerpt: string;
  category: "JOB_TIP" | "COMPANY_NEWS" | "SERVICE_UPDATE";
  published: boolean;
  createdAt: string;
}

export interface NotificationMessage {
  id: string;
  title: string;
  message: string;
  audience: "CANDIDATES" | "EMPLOYERS" | "ALL_USERS";
  channel: "WEBSITE" | "EMAIL" | "SMS" | "WHATSAPP";
  deliveryStatus?: "PENDING" | "SENT" | "FAILED";
  recipientCount?: number;
  deliveredAt?: string;
  deliveryError?: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  applicationId: string;
  jobId: string;
  scheduledAt: string;
  mode: "OFFLINE" | "PHONE" | "VIDEO";
  status: "SCHEDULED" | "RESCHEDULED" | "COMPLETED" | "SELECTED" | "REJECTED" | "NO_SHOW" | "CANCELLED";
  address?: string;
  meetingLink?: string;
  contactPerson?: string;
  contactMobile?: string;
  instructions?: string;
  internalNotes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
}

import { Db, MongoServerError } from "mongodb";
import { ensureMongoSetup, getDatabase, withMongoTransaction } from "@/lib/mongodb";

async function database() {
  await ensureMongoSetup();
  return getDatabase();
}

export type ServiceReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ServiceReview {
  id: string;
  serviceSlug: string;
  customerName: string;
  city?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  status: ServiceReviewStatus;
  createdAt: string;
  updatedAt?: string;
}

const collectionByPrefix: Record<string, string> = {
  ANN: "announcements",
  APP: "applications",
  CGC: "candidates",
  INT: "interviews",
  JOB: "jobs",
  NOT: "notifications",
  POST: "websitePosts",
  REQ: "employerRequirements",
  REV: "serviceReviews",
  PRV: "candidatePrivacyRequests",
  SRV: "serviceRequests",
};

async function nextId(prefix: string) {
  const db = await database();
  const collection = collectionByPrefix[prefix];
  if (!collection) throw new Error(`UNKNOWN_ID_PREFIX:${prefix}`);
  for (;;) {
    const counter = await db.collection<{ _id: string; sequence: number }>("counters").findOneAndUpdate({ _id: prefix }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: "after" });
    const id = `${prefix}-${String((counter?.sequence ?? 0) + 100000).padStart(6, "0")}`;
    if (!await db.collection(collection).findOne({ id }, { projection: { _id: 1 } })) return id;
  }
}

function computeProfileCompletion(candidate: Candidate): number {
  let score = 25;
  if (candidate.currentAddress?.city && candidate.currentAddress?.state) score += 15;
  if (candidate.highestQualification) score += 15;
  if (candidate.experienceType) score += 10;
  if (candidate.jobPreference?.role || candidate.jobPreference?.category) score += 15;
  if (candidate.resumeUploaded) score += 15;
  if (candidate.identityDocumentsUploaded) score += 5;
  return Math.min(100, score);
}

function withoutDocumentStorageKey(document: CandidateDocument): Omit<CandidateDocument, "storageKey"> {
  const safeDocument: Partial<CandidateDocument> = { ...document };
  delete safeDocument.storageKey;
  return safeDocument as Omit<CandidateDocument, "storageKey">;
}

async function updateCandidateAndRecompute(candidateId: string, patch: Partial<Candidate>) {
  const db = await database();
  const current = await db.collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } });
  if (!current) throw new Error("CANDIDATE_NOT_FOUND");
  const profileCompletion = computeProfileCompletion({ ...current, ...patch });
  const candidate = await db.collection<Candidate>("candidates").findOneAndUpdate({ id: candidateId }, { $set: { ...patch, profileCompletion, updatedAt: new Date().toISOString() } }, { returnDocument: "after" });
  if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
  return candidate;
}

export const portalStore = {
  async listPublishedJobs(filters: JobSearchFilters = {}) {
    const db = await database();
    const today = new Date().toISOString().slice(0, 10);
    await db.collection<Job>("jobs").updateMany({ status: "PUBLISHED", applicationDeadline: { $lt: today } }, { $set: { status: "EXPIRED", updatedAt: new Date().toISOString() } });
    const normalizedQuery = filters.q?.trim().toLowerCase();
    const normalizedCity = filters.city?.trim().toLowerCase();
    const filter: Record<string, unknown> = activePublishedJobFilter();
    if (normalizedCity) filter.city = { $regex: `^${escapeRegex(normalizedCity)}$`, $options: "i" };
    if (normalizedQuery) filter.$text = { $search: normalizedQuery };
    if (filters.category) filter.category = filters.category;
    if (filters.employmentType) filter.employmentType = filters.employmentType;
    if (filters.shift) filter.shift = filters.shift;
    if (filters.qualification) filter.qualification = filters.qualification;
    if (filters.fresherOnly) filter.$or = [{ minExperience: { $exists: false } }, { minExperience: 0 }, { minExperience: null }];
    if (Number.isFinite(filters.salaryMin) && (filters.salaryMin ?? -1) >= 0) filter.salaryMax = { $gte: filters.salaryMin };
    if (Number.isFinite(filters.salaryMax) && (filters.salaryMax ?? -1) >= 0) filter.salaryMin = { $lte: filters.salaryMax };
    const sortSpec: Record<string, 1 | -1> = filters.sort === "salary_high" ? { salaryMax: -1 } : filters.sort === "salary_low" ? { salaryMin: 1 } : { urgent: -1, postedAt: -1 };
    const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page as number)) : 1;
    const pageSize = Number.isFinite(filters.pageSize) ? Math.min(50, Math.max(1, Math.floor(filters.pageSize as number))) : 12;
    const [data, total] = await Promise.all([
      db.collection<Job>("jobs").find(filter).sort(sortSpec).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      db.collection<Job>("jobs").countDocuments(filter),
    ]);
    return { data, total, page, pageSize };
  },
  async getPublishedJob(jobId: string) {
    return (await database()).collection<Job>("jobs").findOne({ id: jobId, ...activePublishedJobFilter() });
  },
  async getPublicLanding() {
    const db = await database();
    const today = new Date().toISOString().slice(0, 10);
    await db.collection<Job>("jobs").updateMany({ status: "PUBLISHED", applicationDeadline: { $lt: today } }, { $set: { status: "EXPIRED", updatedAt: new Date().toISOString() } });
    const now = new Date().toISOString();
    const [jobs, announcement, posts, activeJobs, candidateCount, employerCount, serviceClientCount] = await Promise.all([
      db.collection<Job>("jobs").find(activePublishedJobFilter()).sort({ urgent: -1, featured: -1, postedAt: -1 }).limit(3).toArray(),
      db.collection<Announcement>("announcements").find({ $nor: [{ id: "ANN-100001", title: "Urgent Hiring: 50 Security Guards Required in Raipur" }], active: true, $and: [{ $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] }, { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }] }).sort({ createdAt: -1 }).limit(1).next(),
      db.collection<WebsitePost>("websitePosts").find({ $nor: [{ id: "POST-100001", title: "How to prepare for your first interview" }], published: true }).sort({ createdAt: -1 }).limit(3).toArray(),
      db.collection<Job>("jobs").countDocuments(activePublishedJobFilter()),
      db.collection<Candidate>("candidates").countDocuments({ deletedAt: { $exists: false } }),
      db.collection<EmployerRequirement>("employerRequirements").countDocuments(),
      db.collection<ServiceRequest>("serviceRequests").countDocuments(),
    ]);
    return { jobs, announcement, posts, stats: { activeJobs, candidateCount, employerCount, serviceClientCount } };
  },
  async getAdminDashboard(scope: AdminScope) {
    const db = await database();
    const jobs = await db.collection<Job>("jobs").find(jobScopeFilter(scope)).sort({ postedAt: -1 }).toArray();
    const jobIds = jobs.map((job) => job.id);
    const applicationFilter = scope.all ? {} : { jobId: { $in: jobIds } };
    const serviceTypes = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined;
    const serviceFilter = serviceTypes ? { serviceType: { $in: serviceTypes } } : {};
    const requirementFilter = requirementScopeFilter(scope);
    const [candidateCount, applications, newRequirements, newServiceRequests, announcements, websitePosts, notifications, employerRequirements, serviceRequests] = await Promise.all([
      scope.all
        ? db.collection<Candidate>("candidates").countDocuments({ deletedAt: { $exists: false } })
        : db.collection<Application>("applications").distinct("candidateId", applicationFilter).then((ids) => ids.length),
      db.collection<Application>("applications").countDocuments(applicationFilter),
      db.collection<EmployerRequirement>("employerRequirements").countDocuments({ ...requirementFilter, status: "NEW" }),
      db.collection<ServiceRequest>("serviceRequests").countDocuments({ ...serviceFilter, status: "NEW" }),
      scope.all ? db.collection<Announcement>("announcements").find().sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
      scope.all ? db.collection<WebsitePost>("websitePosts").find().sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
      scope.all ? db.collection<NotificationMessage>("notifications").find().sort({ createdAt: -1 }).toArray() : Promise.resolve([]),
      db.collection<EmployerRequirement>("employerRequirements").find(requirementFilter).sort({ createdAt: -1 }).toArray(),
      db.collection<ServiceRequest>("serviceRequests").find(serviceFilter).sort({ createdAt: -1 }).toArray(),
    ]);
    const normalizedJobs = jobs.map((job) => ({ ...job, businessVertical: job.businessVertical ?? inferBusinessVertical(job.category) }));
    const normalizedRequirements = employerRequirements.map((requirement) => ({ ...requirement, businessVertical: requirement.businessVertical ?? inferBusinessVertical(requirement.category) }));
    return {
      metrics: { activeJobs: jobs.filter((job) => job.status === "PUBLISHED" && !isApplicationDeadlineExpired(job.applicationDeadline)).length, candidates: candidateCount, applications, newRequirements, serviceRequests: newServiceRequests },
      jobs: normalizedJobs,
      announcements,
      websitePosts,
      notifications,
      employerRequirements: normalizedRequirements,
      serviceRequests,
    };
  },
  async listAdminJobs(scope: AdminScope) {
    const jobs = await (await database()).collection<Job>("jobs").find(jobScopeFilter(scope)).sort({ postedAt: -1 }).toArray();
    return jobs.map((job) => ({ ...job, businessVertical: job.businessVertical ?? inferBusinessVertical(job.category) }));
  },
  async createAnnouncement(input: Pick<Announcement, "title" | "link">) {
    const announcement: Announcement = { id: await nextId("ANN"), title: input.title, link: input.link, active: true, createdAt: new Date().toISOString() };
    await (await database()).collection<Announcement>("announcements").insertOne(announcement);
    return announcement;
  },
  async createWebsitePost(input: Pick<WebsitePost, "title" | "excerpt" | "category">) {
    const post: WebsitePost = { id: await nextId("POST"), ...input, published: true, createdAt: new Date().toISOString() };
    await (await database()).collection<WebsitePost>("websitePosts").insertOne(post);
    return post;
  },
  async createNotification(input: Omit<NotificationMessage, "id" | "createdAt">) {
    const notification: NotificationMessage = { id: await nextId("NOT"), ...input, createdAt: new Date().toISOString() };
    await (await database()).collection<NotificationMessage>("notifications").insertOne(notification);
    return notification;
  },
  async updateJobStatus(jobId: string, status: JobStatus, scope: AdminScope) {
    const updatedAt = new Date().toISOString();
    const job = await (await database()).collection<Job>("jobs").findOneAndUpdate({ id: jobId, ...jobScopeFilter(scope) }, { $set: { status, updatedAt, ...(status === "ARCHIVED" ? { archivedAt: updatedAt } : {}) }, ...(status !== "ARCHIVED" ? { $unset: { archivedAt: "" } } : {}) }, { returnDocument: "after" });
    if (!job) throw new Error("JOB_NOT_FOUND");
    return job;
  },
  async updateAdminJob(jobId: string, input: Omit<Job, "id" | "status" | "postedAt" | "updatedAt">, scope: AdminScope, status?: JobStatus) {
    const job = await (await database()).collection<Job>("jobs").findOneAndUpdate(
      { id: jobId, ...jobScopeFilter(scope) },
      { $set: { ...input, ...(status ? { status } : {}), updatedAt: new Date().toISOString() } },
      { returnDocument: "after" },
    );
    if (!job) throw new Error("JOB_NOT_FOUND");
    return job;
  },
  async createAdminJob(input: Omit<Job, "id" | "status" | "postedAt">, status: Extract<JobStatus, "DRAFT" | "PUBLISHED"> = "DRAFT") {
    const job: Job = { ...input, id: await nextId("JOB"), status, postedAt: new Date().toISOString() };
    await (await database()).collection<Job>("jobs").insertOne(job);
    return job;
  },
  async createCandidate(input: Omit<Candidate, "id" | "verificationStatus" | "createdAt" | "profileCompletion" | "resumeUploaded">) {
    const createdAt = new Date().toISOString();
    const candidate: Candidate = { id: await nextId("CGC"), fullName: input.fullName, mobile: input.mobile, passwordHash: input.passwordHash, verificationStatus: "PENDING", availability: "AVAILABLE", profileCompletion: 0, resumeUploaded: false, createdAt, retentionReviewAt: input.retentionReviewAt, consents: input.consents, ...(input.email ? { email: input.email } : {}), ...(input.city ? { city: input.city } : {}), ...(input.preferredRole ? { preferredRole: input.preferredRole } : {}) };
    candidate.profileCompletion = computeProfileCompletion(candidate);
    try {
      const db = await database();
      await db.collection<Candidate>("candidates").insertOne(candidate);
      if (candidate.consents) await db.collection("auditLogs").insertOne({ actorId: candidate.id, action: "CANDIDATE_REGISTRATION_CONSENT_ACCEPTED", targetType: "CANDIDATE", targetId: candidate.id, metadata: { privacyPolicyVersion: candidate.consents.privacyPolicyVersion, termsVersion: candidate.consents.termsVersion }, createdAt });
      return candidate;
    } catch (error) { if (error instanceof MongoServerError && error.code === 11000) throw new Error(error.keyPattern?.email ? "DUPLICATE_EMAIL" : "DUPLICATE_MOBILE"); throw error; }
  },
  async getCandidateByMobile(mobile: string) {
    return (await database()).collection<Candidate>("candidates").findOne({ mobile, deletedAt: { $exists: false } });
  },
  async getCandidateById(candidateId: string) {
    return (await database()).collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } });
  },
  async updateCandidateProfile(candidateId: string, input: Pick<Candidate, "city" | "preferredRole" | "email">) {
    const updates = Object.fromEntries(Object.entries(input).filter(([, value]) => Boolean(value))) as Partial<Candidate>;
    return updateCandidateAndRecompute(candidateId, updates);
  },
  async listCandidates(filters: { query?: string; verificationStatus?: Candidate["verificationStatus"]; availability?: NonNullable<Candidate["availability"]> }, scope: AdminScope) {
    const db = await database();
    const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
    if (!scope.all) filter.id = { $in: await candidateIdsForScope(db, scope) };
    if (filters.verificationStatus) filter.verificationStatus = filters.verificationStatus;
    if (filters.availability) filter.availability = filters.availability;
    if (filters.query?.trim()) filter.$or = [{ fullName: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }, { mobile: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }, { email: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }, { id: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }, { city: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }, { preferredRole: { $regex: escapeRegex(filters.query.trim()), $options: "i" } }];
    return db.collection<Candidate>("candidates").find(filter, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  },
  async getAdminCandidateDetails(candidateId: string, scope: AdminScope): Promise<AdminCandidateDetails> {
    const db = await database();
    if (!scope.all && !await canAccessCandidate(db, candidateId, scope)) throw new Error("CANDIDATE_NOT_FOUND");
    const candidate = await db.collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } }, { projection: { passwordHash: 0 } });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    const allowedJobIds = scope.all ? undefined : await jobIdsForScope(db, scope);
    const applicationFilter = { candidateId, deletedAt: { $exists: false }, ...(allowedJobIds ? { jobId: { $in: allowedJobIds } } : {}) };
    const interviewFilter = { candidateId, ...(allowedJobIds ? { jobId: { $in: allowedJobIds } } : {}) };
    const [education, experience, storedDocuments, applications, interviews] = await Promise.all([
      db.collection<CandidateEducation>("candidateEducations").findOne({ candidateId }),
      db.collection<CandidateExperience>("candidateExperiences").findOne({ candidateId }),
      db.collection<CandidateDocument>("candidateDocuments").find({ candidateId }).sort({ createdAt: -1 }).toArray(),
      db.collection<Application>("applications").find(applicationFilter).sort({ appliedAt: -1 }).toArray(),
      db.collection<Interview>("interviews").find(interviewFilter).sort({ scheduledAt: -1 }).toArray(),
    ]);
    const jobIds = [...new Set([...applications.map((application) => application.jobId), ...interviews.map((interview) => interview.jobId)])];
    const jobs = await db.collection<Job>("jobs").find({ id: { $in: jobIds } }).toArray();
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    const documents = storedDocuments.map(withoutDocumentStorageKey);
    return {
      candidate,
      education,
      experience,
      documents,
      applications: applications.map((application) => ({ ...application, job: jobById.get(application.jobId) })),
      interviews: interviews.map((interview) => ({ ...interview, job: jobById.get(interview.jobId) })),
    };
  },
  async getAdminCandidateDocument(candidateId: string, type: CandidateDocumentType, scope: AdminScope) {
    const db = await database();
    if (!scope.all && !await canAccessCandidate(db, candidateId, scope)) throw new Error("DOCUMENT_NOT_FOUND");
    const document = await db.collection<CandidateDocument>("candidateDocuments").findOne({ candidateId, type });
    if (!document) throw new Error("DOCUMENT_NOT_FOUND");
    return document;
  },
  async updateCandidateDocumentStatus(candidateId: string, type: CandidateDocumentType, status: CandidateDocument["status"], rejectionReason: string | undefined, verifiedBy: string, scope: AdminScope) {
    const db = await database();
    if (!scope.all && !await canAccessCandidate(db, candidateId, scope)) throw new Error("DOCUMENT_NOT_FOUND");
    const updatedAt = new Date().toISOString();
    const set: Record<string, unknown> = { status, verifiedBy, verifiedAt: updatedAt };
    if (status === "REJECTED") set.rejectionReason = rejectionReason;
    const document = await db.collection<CandidateDocument>("candidateDocuments").findOneAndUpdate(
      { candidateId, type },
      { $set: set, ...(status !== "REJECTED" ? { $unset: { rejectionReason: "" } } : {}) },
      { returnDocument: "after" },
    );
    if (!document) throw new Error("DOCUMENT_NOT_FOUND");
    await db.collection("auditLogs").insertOne({ actorId: verifiedBy, action: "CANDIDATE_DOCUMENT_STATUS_UPDATED", targetType: "CANDIDATE_DOCUMENT", targetId: `${candidateId}:${type}`, metadata: { status }, createdAt: updatedAt });
    return withoutDocumentStorageKey(document);
  },
  async updateCandidateOperationalStatus(candidateId: string, input: Pick<Candidate, "verificationStatus"> & { availability?: Candidate["availability"] }, scope: AdminScope) {
    const db = await database();
    if (!scope.all && !await canAccessCandidate(db, candidateId, scope)) throw new Error("CANDIDATE_NOT_FOUND");
    const update: Record<string, unknown> = { verificationStatus: input.verificationStatus, updatedAt: new Date().toISOString() };
    if (input.availability) update.availability = input.availability;
    const candidate = await db.collection<Candidate>("candidates").findOneAndUpdate({ id: candidateId }, { $set: update }, { returnDocument: "after" });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    return candidate;
  },
  async createApplication(candidateId: string, jobId: string) {
    const db = await database();
    const candidate = await db.collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } });
    if (!candidate || candidate.verificationStatus === "BLOCKED") throw new Error("CANDIDATE_NOT_ELIGIBLE");
    if ((candidate.profileCompletion ?? 0) < 55) throw new Error("PROFILE_INCOMPLETE");
    const job = await db.collection<Job>("jobs").findOne({ id: jobId, ...activePublishedJobFilter() });
    if (!job) throw new Error("JOB_NOT_AVAILABLE");
    const appliedAt = new Date().toISOString();
    const application: Application = { id: await nextId("APP"), candidateId, jobId, status: "APPLIED", statusHistory: [{ status: "APPLIED", at: appliedAt }], appliedAt };
    try { await db.collection<Application>("applications").insertOne(application); return application; } catch (error) { if (error instanceof MongoServerError && error.code === 11000) throw new Error("DUPLICATE_APPLICATION"); throw error; }
  },
  async listCandidateApplications(candidateId: string) {
    const db = await database();
    const applications = await db.collection<Application>("applications").find({ candidateId, deletedAt: { $exists: false } }).sort({ appliedAt: -1 }).toArray();
    const jobIds = applications.map((application) => application.jobId);
    const jobs = await db.collection<Job>("jobs").find({ id: { $in: jobIds } }).toArray();
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    return applications.map((application) => ({ ...application, job: jobById.get(application.jobId) }));
  },
  async listAdminApplications(status: ApplicationStatus | undefined, scope: AdminScope) {
    const db = await database();
    const jobIds = await jobIdsForScope(db, scope);
    const applications = await db.collection<Application>("applications").find({ ...(status ? { status } : {}), ...(!scope.all ? { jobId: { $in: jobIds } } : {}), deletedAt: { $exists: false } }).sort({ appliedAt: -1 }).limit(500).toArray();
    const [candidates, jobs] = await Promise.all([db.collection<Candidate>("candidates").find({ id: { $in: applications.map((application) => application.candidateId) } }, { projection: { passwordHash: 0 } }).toArray(), db.collection<Job>("jobs").find({ id: { $in: applications.map((application) => application.jobId) } }).toArray()]);
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate])); const jobById = new Map(jobs.map((job) => [job.id, job]));
    return applications.map((application) => ({ ...application, candidate: candidateById.get(application.candidateId), job: jobById.get(application.jobId) }));
  },
  async updateApplicationStatus(applicationId: string, status: ApplicationStatus, scope: AdminScope) {
    const db = await database(); const timestamp = new Date().toISOString();
    const jobIds = await jobIdsForScope(db, scope);
    const application = await db.collection<Application>("applications").findOneAndUpdate({ id: applicationId, ...(!scope.all ? { jobId: { $in: jobIds } } : {}) }, { $set: { status, updatedAt: timestamp }, $push: { statusHistory: { status, at: timestamp } } }, { returnDocument: "after" });
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    return application;
  },
  async scheduleInterview(input: Omit<Interview, "id" | "status" | "createdAt">, scope: AdminScope) {
    const interview: Interview = { ...input, id: await nextId("INT"), status: "SCHEDULED", createdAt: new Date().toISOString() };
    return withMongoTransaction(async (db, session) => {
      const application = await db.collection<Application>("applications").findOne(
        { id: input.applicationId, candidateId: input.candidateId, jobId: input.jobId, status: "SHORTLISTED" },
        { session },
      );
      if (!application) throw new Error("APPLICATION_NOT_FOUND");
      const allowedJob = await db.collection<Job>("jobs").findOne({ id: input.jobId, ...jobScopeFilter(scope) }, { session });
      if (!allowedJob) throw new Error("APPLICATION_NOT_FOUND");
      const timestamp = new Date().toISOString();
      await db.collection<Interview>("interviews").insertOne(interview, { session });
      await db.collection<Application>("applications").updateOne(
        { id: input.applicationId },
        { $set: { status: "INTERVIEW_SCHEDULED", updatedAt: timestamp }, $push: { statusHistory: { status: "INTERVIEW_SCHEDULED", at: timestamp } } },
        { session },
      );
      return interview;
    });
  },
  async listCandidateInterviews(candidateId: string) {
    const db = await database(); const interviews = await db.collection<Interview>("interviews").find({ candidateId }).sort({ scheduledAt: 1 }).toArray(); const jobs = await db.collection<Job>("jobs").find({ id: { $in: interviews.map((interview) => interview.jobId) } }).toArray(); const jobById = new Map(jobs.map((job) => [job.id, job])); return interviews.map((interview) => ({ ...interview, job: jobById.get(interview.jobId) }));
  },
  async listAdminInterviews(scope: AdminScope) {
    const db = await database(); const jobIds = await jobIdsForScope(db, scope); const interviews = await db.collection<Interview>("interviews").find(scope.all ? {} : { jobId: { $in: jobIds } }).sort({ scheduledAt: 1 }).toArray(); const [candidates, jobs] = await Promise.all([db.collection<Candidate>("candidates").find({ id: { $in: interviews.map((interview) => interview.candidateId) } }, { projection: { passwordHash: 0 } }).toArray(), db.collection<Job>("jobs").find({ id: { $in: interviews.map((interview) => interview.jobId) } }).toArray()]); const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate])); const jobById = new Map(jobs.map((job) => [job.id, job])); return interviews.map((interview) => ({ ...interview, candidate: candidateById.get(interview.candidateId), job: jobById.get(interview.jobId) }));
  },
  async updateInterviewStatus(interviewId: string, status: Interview["status"], scope: AdminScope) {
    return withMongoTransaction(async (db, session) => {
      const jobIds = await jobIdsForScope(db, scope);
      const interview = await db.collection<Interview>("interviews").findOneAndUpdate(
        { id: interviewId, ...(!scope.all ? { jobId: { $in: jobIds } } : {}) },
        { $set: { status } },
        { returnDocument: "after", session },
      );
      if (!interview) throw new Error("INTERVIEW_NOT_FOUND");
      const linkedApplicationStatus: Partial<Record<Interview["status"], ApplicationStatus>> = { COMPLETED: "INTERVIEWED", SELECTED: "SELECTED", REJECTED: "REJECTED" };
      const applicationStatus = linkedApplicationStatus[status];
      if (applicationStatus) {
        const timestamp = new Date().toISOString();
        await db.collection<Application>("applications").updateOne(
          { id: interview.applicationId },
          { $set: { status: applicationStatus, updatedAt: timestamp }, $push: { statusHistory: { status: applicationStatus, at: timestamp } } },
          { session },
        );
      }
      return interview;
    });
  },
  async updateCandidateAddress(candidateId: string, input: { currentAddress: Address; permanentAddress?: Address & { sameAsCurrent?: boolean } }) {
    const permanentAddress = input.permanentAddress?.sameAsCurrent ? { ...input.currentAddress, sameAsCurrent: true } : input.permanentAddress;
    return updateCandidateAndRecompute(candidateId, { currentAddress: input.currentAddress, ...(permanentAddress ? { permanentAddress } : {}), ...(input.currentAddress.city ? { city: input.currentAddress.city } : {}) });
  },
  async upsertCandidateEducation(candidateId: string, input: Omit<CandidateEducation, "candidateId" | "createdAt">) {
    const db = await database();
    const createdAt = new Date().toISOString();
    await db.collection<CandidateEducation>("candidateEducations").findOneAndUpdate({ candidateId }, { $set: { candidateId, ...input, createdAt } }, { upsert: true, returnDocument: "after" });
    return updateCandidateAndRecompute(candidateId, { highestQualification: input.qualification });
  },
  async getCandidateEducation(candidateId: string) {
    return (await database()).collection<CandidateEducation>("candidateEducations").findOne({ candidateId });
  },
  async upsertCandidateExperience(candidateId: string, input: { experienceType: "FRESHER" | "EXPERIENCED"; totalExperienceYears?: number } & Omit<CandidateExperience, "candidateId" | "createdAt">) {
    const db = await database();
    if (input.experienceType === "EXPERIENCED") {
      const createdAt = new Date().toISOString();
      await db.collection<CandidateExperience>("candidateExperiences").findOneAndUpdate({ candidateId }, { $set: { candidateId, company: input.company, jobRole: input.jobRole, salary: input.salary, startDate: input.startDate, endDate: input.endDate, responsibilities: input.responsibilities, createdAt } }, { upsert: true, returnDocument: "after" });
    }
    return updateCandidateAndRecompute(candidateId, { experienceType: input.experienceType, ...(input.totalExperienceYears !== undefined ? { totalExperienceYears: input.totalExperienceYears } : {}) });
  },
  async getCandidateExperience(candidateId: string) {
    return (await database()).collection<CandidateExperience>("candidateExperiences").findOne({ candidateId });
  },
  async updateCandidateJobPreference(candidateId: string, input: JobPreference) {
    return updateCandidateAndRecompute(candidateId, { jobPreference: input, ...(input.role ? { preferredRole: input.role } : {}) });
  },
  async recordCandidateDocumentConsent(candidateId: string, version: string, acceptedAt: string) {
    const db = await database();
    const candidate = await db.collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } }, { projection: { consents: 1 } });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    if (candidate.consents?.documentProcessingVersion !== version) {
      await Promise.all([
        db.collection<Candidate>("candidates").updateOne({ id: candidateId }, { $set: { "consents.documentProcessingVersion": version, "consents.documentProcessingAcceptedAt": acceptedAt, updatedAt: acceptedAt } }),
        db.collection("auditLogs").insertOne({ actorId: candidateId, action: "DOCUMENT_PROCESSING_CONSENT_ACCEPTED", targetType: "CANDIDATE", targetId: candidateId, metadata: { version }, createdAt: acceptedAt }),
      ]);
    }
  },
  async confirmCandidateDocument(candidateId: string, type: CandidateDocumentType, storageKey: string, consentVersion: string, consentAcceptedAt: string, retentionReviewAt: string) {
    const db = await database();
    const timestamp = new Date().toISOString();
    const previous = await db.collection<CandidateDocument>("candidateDocuments").findOneAndUpdate(
      { candidateId, type },
      { $set: { candidateId, type, storageKey, status: "PENDING", consentVersion, consentAcceptedAt, retentionReviewAt, updatedAt: timestamp }, $setOnInsert: { createdAt: timestamp }, $unset: { rejectionReason: "", verifiedBy: "", verifiedAt: "" } },
      { upsert: true, returnDocument: "before" },
    );
    const documents = await db.collection<CandidateDocument>("candidateDocuments").find({ candidateId }).toArray();
    const identityTypes: CandidateDocumentType[] = ["AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO"];
    const candidate = await updateCandidateAndRecompute(candidateId, {
      resumeUploaded: documents.some((document) => document.type === "RESUME"),
      identityDocumentsUploaded: documents.some((document) => identityTypes.includes(document.type)),
    });
    await db.collection("auditLogs").insertOne({ actorId: candidateId, action: previous ? "CANDIDATE_DOCUMENT_REPLACED" : "CANDIDATE_DOCUMENT_UPLOADED", targetType: "CANDIDATE_DOCUMENT", targetId: `${candidateId}:${type}`, metadata: { type, consentVersion }, createdAt: timestamp });
    return { candidate, replacedStorageKey: previous?.storageKey };
  },
  async listCandidateDocuments(candidateId: string) {
    return (await database()).collection<CandidateDocument>("candidateDocuments").find({ candidateId }).toArray();
  },
  async getCandidateDocument(candidateId: string, type: CandidateDocumentType) {
    return (await database()).collection<CandidateDocument>("candidateDocuments").findOne({ candidateId, type });
  },
  async deleteCandidateDocument(candidateId: string, type: CandidateDocumentType) {
    const db = await database();
    const document = await db.collection<CandidateDocument>("candidateDocuments").findOneAndDelete({ candidateId, type });
    if (!document) throw new Error("DOCUMENT_NOT_FOUND");
    const documents = await db.collection<CandidateDocument>("candidateDocuments").find({ candidateId }).toArray();
    const identityTypes: CandidateDocumentType[] = ["AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO"];
    await updateCandidateAndRecompute(candidateId, {
      resumeUploaded: documents.some((item) => item.type === "RESUME"),
      identityDocumentsUploaded: documents.some((item) => identityTypes.includes(item.type)),
    });
    await db.collection("auditLogs").insertOne({ actorId: candidateId, action: "CANDIDATE_DOCUMENT_DELETED", targetType: "CANDIDATE_DOCUMENT", targetId: `${candidateId}:${type}`, metadata: { type }, createdAt: new Date().toISOString() });
    return document;
  },
  async logCandidateDocumentAccess(actorId: string, actorRole: "CANDIDATE" | "ADMIN", candidateId: string, type: CandidateDocumentType, ipAddress?: string) {
    await (await database()).collection("auditLogs").insertOne({ actorId, action: "CANDIDATE_DOCUMENT_ACCESSED", targetType: "CANDIDATE_DOCUMENT", targetId: `${candidateId}:${type}`, metadata: { type, actorRole }, ...(ipAddress ? { ipAddress } : {}), createdAt: new Date().toISOString() });
  },
  async getCandidatePrivacySummary(candidateId: string) {
    const db = await database();
    const [candidate, request] = await Promise.all([
      db.collection<Candidate>("candidates").findOne({ id: candidateId, deletedAt: { $exists: false } }, { projection: { _id: 0, consents: 1, retentionReviewAt: 1, createdAt: 1 } }),
      db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").find({ candidateId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(1).next(),
    ]);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    return { consents: candidate.consents, retentionReviewAt: candidate.retentionReviewAt, accountCreatedAt: candidate.createdAt, latestRequest: request };
  },
  async recordCandidatePolicyConsent(candidateId: string, privacyPolicyVersion: string, termsVersion: string, acceptedAt: string, retentionReviewAt: string) {
    const db = await database();
    const result = await db.collection<Candidate>("candidates").updateOne(
      { id: candidateId, deletedAt: { $exists: false } },
      {
        $set: {
          "consents.privacyPolicyVersion": privacyPolicyVersion,
          "consents.privacyAcceptedAt": acceptedAt,
          "consents.termsVersion": termsVersion,
          "consents.termsAcceptedAt": acceptedAt,
          retentionReviewAt,
          updatedAt: acceptedAt,
        },
      },
    );
    if (!result.matchedCount) throw new Error("CANDIDATE_NOT_FOUND");
    await db.collection("auditLogs").insertOne({
      actorId: candidateId,
      action: "CANDIDATE_POLICY_CONSENT_ACCEPTED",
      targetType: "CANDIDATE",
      targetId: candidateId,
      metadata: { privacyPolicyVersion, termsVersion },
      createdAt: acceptedAt,
    });
    return this.getCandidatePrivacySummary(candidateId);
  },
  async createCandidateDataDeletionRequest(candidateId: string, reason?: string) {
    const db = await database();
    const existing = await db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").findOne({ candidateId, status: { $in: ["SUBMITTED", "IN_REVIEW"] } });
    if (existing) throw new Error("PRIVACY_REQUEST_EXISTS");
    const createdAt = new Date().toISOString();
    const privacyRequest: CandidatePrivacyRequest = { id: await nextId("PRV"), candidateId, type: "DATA_DELETION", status: "SUBMITTED", ...(reason ? { reason } : {}), createdAt };
    await Promise.all([
      db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").insertOne(privacyRequest),
      db.collection<Candidate>("candidates").updateOne({ id: candidateId }, { $set: { deletionRequestedAt: createdAt, updatedAt: createdAt } }),
      db.collection("auditLogs").insertOne({ actorId: candidateId, action: "CANDIDATE_DATA_DELETION_REQUESTED", targetType: "PRIVACY_REQUEST", targetId: privacyRequest.id, metadata: { type: privacyRequest.type }, createdAt }),
    ]);
    return privacyRequest;
  },
  async cancelCandidateDataDeletionRequest(candidateId: string) {
    const db = await database();
    const updatedAt = new Date().toISOString();
    const privacyRequest = await db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").findOneAndUpdate(
      { candidateId, status: "SUBMITTED" },
      { $set: { status: "CANCELLED", updatedAt } },
      { returnDocument: "after", sort: { createdAt: -1 } },
    );
    if (!privacyRequest) throw new Error("PRIVACY_REQUEST_NOT_FOUND");
    await Promise.all([
      db.collection<Candidate>("candidates").updateOne({ id: candidateId }, { $unset: { deletionRequestedAt: "" }, $set: { updatedAt } }),
      db.collection("auditLogs").insertOne({ actorId: candidateId, action: "CANDIDATE_DATA_DELETION_CANCELLED", targetType: "PRIVACY_REQUEST", targetId: privacyRequest.id, metadata: {}, createdAt: updatedAt }),
    ]);
    return privacyRequest;
  },
  async getCandidateDataExport(candidateId: string) {
    const db = await database();
    const [candidate, education, experience, documents, applications, interviews, savedJobs, privacyRequests] = await Promise.all([
      db.collection<Candidate>("candidates").findOne({ id: candidateId }, { projection: { _id: 0, passwordHash: 0 } }),
      db.collection<CandidateEducation>("candidateEducations").findOne({ candidateId }, { projection: { _id: 0 } }),
      db.collection<CandidateExperience>("candidateExperiences").findOne({ candidateId }, { projection: { _id: 0 } }),
      db.collection<CandidateDocument>("candidateDocuments").find({ candidateId }, { projection: { _id: 0, storageKey: 0 } }).toArray(),
      db.collection<Application>("applications").find({ candidateId }, { projection: { _id: 0 } }).toArray(),
      db.collection<Interview>("interviews").find({ candidateId }, { projection: { _id: 0 } }).toArray(),
      db.collection<SavedJob>("savedJobs").find({ candidateId }, { projection: { _id: 0 } }).toArray(),
      db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").find({ candidateId }, { projection: { _id: 0 } }).toArray(),
    ]);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    return { exportedAt: new Date().toISOString(), candidate, education, experience, documents, applications, interviews, savedJobs, privacyRequests };
  },
  async listAdminCandidatePrivacyRequests() {
    const db = await database();
    const requests = await db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").find().sort({ createdAt: -1 }).limit(250).toArray();
    const candidates = await db.collection<Candidate>("candidates").find({ id: { $in: requests.map((item) => item.candidateId) } }, { projection: { passwordHash: 0 } }).toArray();
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return requests.map((request) => ({ ...request, candidate: candidateById.get(request.candidateId) }));
  },
  async getCandidatePrivacyRequestForAdmin(requestId: string) {
    const request = await (await database()).collection<CandidatePrivacyRequest>("candidatePrivacyRequests").findOne({ id: requestId });
    if (!request) throw new Error("PRIVACY_REQUEST_NOT_FOUND");
    return request;
  },
  async getCandidateDocumentKeysForDeletion(candidateId: string) {
    return (await database()).collection<CandidateDocument>("candidateDocuments").find({ candidateId }, { projection: { storageKey: 1 } }).toArray();
  },
  async updateCandidatePrivacyRequest(requestId: string, status: Exclude<CandidatePrivacyRequestStatus, "SUBMITTED" | "CANCELLED">, actorId: string, resolutionNote?: string) {
    return withMongoTransaction(async (db, session) => {
      const updatedAt = new Date().toISOString();
      const request = await db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").findOne({ id: requestId }, { session });
      if (!request || request.status === "COMPLETED" || request.status === "CANCELLED") throw new Error("PRIVACY_REQUEST_NOT_FOUND");
      if (status === "COMPLETED") {
        await Promise.all([
          db.collection<CandidateDocument>("candidateDocuments").deleteMany({ candidateId: request.candidateId }, { session }),
          db.collection<CandidateEducation>("candidateEducations").deleteMany({ candidateId: request.candidateId }, { session }),
          db.collection<CandidateExperience>("candidateExperiences").deleteMany({ candidateId: request.candidateId }, { session }),
          db.collection<SavedJob>("savedJobs").deleteMany({ candidateId: request.candidateId }, { session }),
          db.collection<NotificationRead>("notificationReads").deleteMany({ candidateId: request.candidateId }, { session }),
          db.collection<Candidate>("candidates").deleteOne({ id: request.candidateId }, { session }),
        ]);
      } else if (status === "REJECTED") {
        await db.collection<Candidate>("candidates").updateOne({ id: request.candidateId }, { $unset: { deletionRequestedAt: "" }, $set: { updatedAt } }, { session });
      }
      const updated = await db.collection<CandidatePrivacyRequest>("candidatePrivacyRequests").findOneAndUpdate(
        { id: requestId },
        { $set: { status, resolvedBy: actorId, resolutionNote: resolutionNote ?? "", updatedAt }, ...(status === "COMPLETED" ? { $unset: { reason: "" } } : {}) },
        { returnDocument: "after", session },
      );
      await db.collection("auditLogs").insertOne({ actorId, action: `CANDIDATE_PRIVACY_REQUEST_${status}`, targetType: "PRIVACY_REQUEST", targetId: requestId, metadata: { candidateId: request.candidateId, type: request.type }, createdAt: updatedAt }, { session });
      if (!updated) throw new Error("PRIVACY_REQUEST_NOT_FOUND");
      return updated;
    });
  },
  async saveJob(candidateId: string, jobId: string) {
    const db = await database();
    const job = await db.collection<Job>("jobs").findOne({ id: jobId, ...activePublishedJobFilter() }, { projection: { id: 1, applicationDeadline: 1 } });
    if (!job) throw new Error("JOB_NOT_AVAILABLE");
    const savedJob: SavedJob = { candidateId, jobId, createdAt: new Date().toISOString() };
    try { await db.collection<SavedJob>("savedJobs").insertOne(savedJob); } catch (error) { if (!(error instanceof MongoServerError && error.code === 11000)) throw error; }
    return savedJob;
  },
  async unsaveJob(candidateId: string, jobId: string) {
    await (await database()).collection<SavedJob>("savedJobs").deleteOne({ candidateId, jobId });
  },
  async listSavedJobIds(candidateId: string) {
    const rows = await (await database()).collection<SavedJob>("savedJobs").find({ candidateId }).toArray();
    return rows.map((row) => row.jobId);
  },
  async listSavedJobs(candidateId: string) {
    const db = await database();
    const savedJobs = await db.collection<SavedJob>("savedJobs").find({ candidateId }).sort({ createdAt: -1 }).toArray();
    const jobs = await db.collection<Job>("jobs").find({ id: { $in: savedJobs.map((savedJob) => savedJob.jobId) } }).toArray();
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    return savedJobs.map((savedJob) => ({ ...savedJob, job: jobById.get(savedJob.jobId) }));
  },
  async listCandidateNotifications(candidateId: string) {
    const db = await database();
    const [notifications, reads] = await Promise.all([
      db.collection<NotificationMessage>("notifications").find({ channel: "WEBSITE", audience: { $in: ["CANDIDATES", "ALL_USERS"] } }).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection<NotificationRead>("notificationReads").find({ candidateId }).toArray(),
    ]);
    const readIds = new Set(reads.map((read) => read.notificationId));
    return notifications.map((notification) => ({ ...notification, read: readIds.has(notification.id) }));
  },
  async markNotificationRead(candidateId: string, notificationId: string) {
    await (await database()).collection<NotificationRead>("notificationReads").updateOne({ candidateId, notificationId }, { $setOnInsert: { candidateId, notificationId, readAt: new Date().toISOString() } }, { upsert: true });
  },
  async markAllNotificationsRead(candidateId: string) {
    const db = await database();
    const notifications = await db.collection<NotificationMessage>("notifications").find({ channel: "WEBSITE", audience: { $in: ["CANDIDATES", "ALL_USERS"] } }).toArray();
    if (!notifications.length) return;
    const readAt = new Date().toISOString();
    await db.collection<NotificationRead>("notificationReads").bulkWrite(notifications.map((notification) => ({ updateOne: { filter: { candidateId, notificationId: notification.id }, update: { $setOnInsert: { candidateId, notificationId: notification.id, readAt } }, upsert: true } })));
  },
  async listJobCategories() {
    return (await database()).collection<Job>("jobs").distinct("category", activePublishedJobFilter());
  },
  async listJobCategoryCounts() {
    const db = await database();
    const rows = await db.collection<Job>("jobs").aggregate<{ _id: string; count: number }>([
      { $match: activePublishedJobFilter() },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).toArray();
    const merged = new Map<string, { category: string; count: number }>();
    for (const row of rows) {
      const key = row._id.toLowerCase();
      const existing = merged.get(key);
      if (existing) existing.count += row.count;
      else merged.set(key, { category: row._id, count: row.count });
    }
    return Array.from(merged.values()).sort((a, b) => b.count - a.count);
  },
  async listSitemapJobs() {
    return (await database()).collection<Job>("jobs").find(activePublishedJobFilter()).sort({ postedAt: -1 }).toArray();
  },
  async getSiteSettings() {
    const db = await database();
    const doc = await db.collection<{ key: string; value: SiteSettings; updatedAt: string }>("settings").findOne({ key: "site" });
    return withoutPlaceholderContactDetails({ ...defaultSiteSettings, ...doc?.value });
  },
  async updateSiteSettings(input: Partial<SiteSettings>, updatedBy?: string) {
    const db = await database();
    const current = await db.collection<{ key: string; value: SiteSettings; updatedAt: string }>("settings").findOne({ key: "site" });
    const merged = withoutPlaceholderContactDetails({ ...defaultSiteSettings, ...current?.value, ...input });
    await db.collection("settings").findOneAndUpdate({ key: "site" }, { $set: { key: "site", value: merged, updatedAt: new Date().toISOString(), ...(updatedBy ? { updatedBy } : {}) } }, { upsert: true, returnDocument: "after" });
    return merged;
  },
  async createEmployerRequirement(input: Omit<EmployerRequirement, "id" | "status" | "createdAt">) {
    const requirement: EmployerRequirement = { ...input, businessVertical: input.businessVertical ?? inferBusinessVertical(input.category), id: await nextId("REQ"), status: "NEW", createdAt: new Date().toISOString() };
    await (await database()).collection<EmployerRequirement>("employerRequirements").insertOne(requirement);
    return requirement;
  },
  async updateEmployerRequirementStatus(requirementId: string, status: LeadStatus, actorId: string, scope: AdminScope) {
    return withMongoTransaction(async (db, session) => {
      const updatedAt = new Date().toISOString();
      const previous = await db.collection<EmployerRequirement>("employerRequirements").findOneAndUpdate(
        { id: requirementId, ...requirementScopeFilter(scope) },
        { $set: { status, updatedAt } },
        { returnDocument: "before", session },
      );
      if (!previous) throw new Error("EMPLOYER_REQUIREMENT_NOT_FOUND");
      if (previous.status !== status) {
        await db.collection("auditLogs").insertOne({ actorId, action: "EMPLOYER_REQUIREMENT_STATUS_UPDATED", targetType: "EMPLOYER_REQUIREMENT", targetId: requirementId, metadata: { from: previous.status, to: status }, createdAt: updatedAt }, { session });
      }
      return { ...previous, status, updatedAt };
    });
  },
  async createServiceRequest(input: Omit<ServiceRequest, "id" | "status" | "createdAt">) {
    const request: ServiceRequest = { ...input, id: await nextId("SRV"), status: "NEW", createdAt: new Date().toISOString() };
    await (await database()).collection<ServiceRequest>("serviceRequests").insertOne(request);
    return request;
  },
  async createServiceReview(input: Omit<ServiceReview, "id" | "status" | "createdAt" | "updatedAt">) {
    const review: ServiceReview = { ...input, id: await nextId("REV"), status: "PENDING", createdAt: new Date().toISOString() };
    await (await database()).collection<ServiceReview>("serviceReviews").insertOne(review);
    return review;
  },
  async listApprovedServiceReviews(serviceSlug: string) {
    return (await database()).collection<ServiceReview>("serviceReviews")
      .find({ serviceSlug, status: "APPROVED" })
      .sort({ createdAt: -1 })
      .limit(12)
      .toArray();
  },
  async listAdminServiceReviews(status?: ServiceReviewStatus) {
    return (await database()).collection<ServiceReview>("serviceReviews")
      .find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
  },
  async updateServiceReviewStatus(reviewId: string, status: ServiceReviewStatus, actorId: string) {
    return withMongoTransaction(async (db, session) => {
      const updatedAt = new Date().toISOString();
      const previous = await db.collection<ServiceReview>("serviceReviews").findOneAndUpdate(
        { id: reviewId },
        { $set: { status, updatedAt } },
        { returnDocument: "before", session },
      );
      if (!previous) throw new Error("SERVICE_REVIEW_NOT_FOUND");
      if (previous.status !== status) {
        await db.collection("auditLogs").insertOne({ actorId, action: "SERVICE_REVIEW_STATUS_UPDATED", targetType: "SERVICE_REVIEW", targetId: reviewId, metadata: { from: previous.status, to: status }, createdAt: updatedAt }, { session });
      }
      return { ...previous, status, updatedAt };
    });
  },
  async listAdminServiceRequests(scope: AdminScope) {
    const db = await database();
    const serviceTypes = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined;
    return db.collection<ServiceRequest>("serviceRequests")
      .find(serviceTypes ? { serviceType: { $in: serviceTypes } } : {})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
  },
  async updateServiceRequestStatus(requestId: string, status: ServiceRequest["status"], actorId: string, scope: AdminScope) {
    return withMongoTransaction(async (db, session) => {
      const updatedAt = new Date().toISOString();
      const serviceTypes = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined;
      const previous = await db.collection<ServiceRequest>("serviceRequests").findOneAndUpdate(
        { id: requestId, ...(serviceTypes ? { serviceType: { $in: serviceTypes } } : {}) },
        { $set: { status, updatedAt } },
        { returnDocument: "before", session },
      );
      if (!previous) throw new Error("SERVICE_REQUEST_NOT_FOUND");
      if (previous.status !== status) {
        await db.collection("auditLogs").insertOne({ actorId, action: "SERVICE_REQUEST_STATUS_UPDATED", targetType: "SERVICE_REQUEST", targetId: requestId, metadata: { from: previous.status, to: status }, createdAt: updatedAt }, { session });
      }
      return { ...previous, status, updatedAt };
    });
  },
};

async function jobIdsForScope(db: Db, scope: AdminScope) {
  if (scope.all) return [];
  const jobs = await db.collection<Job>("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray();
  return jobs.map((job) => job.id);
}

async function candidateIdsForScope(db: Db, scope: AdminScope) {
  if (scope.all) return [];
  const jobIds = await jobIdsForScope(db, scope);
  return db.collection<Application>("applications").distinct("candidateId", { jobId: { $in: jobIds } });
}

async function canAccessCandidate(db: Db, candidateId: string, scope: AdminScope) {
  if (scope.all) return true;
  const jobIds = await jobIdsForScope(db, scope);
  return Boolean(await db.collection<Application>("applications").findOne({ candidateId, jobId: { $in: jobIds } }, { projection: { _id: 1 } }));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function activePublishedJobFilter(): Record<string, unknown> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return {
    status: "PUBLISHED",
    $nor: [
      { id: "JOB-10001", title: "Security Guard", company: "SecurePoint Facilities" },
      { id: "JOB-10002", title: "Office Assistant", company: "Aarav Enterprises" },
      { id: "JOB-10003", title: "Patient Care Attendant", company: "CareFirst Services" },
    ],
    $and: [{ $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: "" }, { applicationDeadline: { $gte: today } }] }],
  };
}

function isApplicationDeadlineExpired(deadline?: string) {
  if (!deadline) return false;
  const endOfDeadline = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? `${deadline}T23:59:59.999+05:30` : deadline;
  const timestamp = Date.parse(endOfDeadline);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}
