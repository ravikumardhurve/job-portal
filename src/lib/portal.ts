export type JobStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "PAUSED" | "CLOSED" | "FILLED" | "EXPIRED" | "ARCHIVED";
export type ApplicationStatus = "APPLIED" | "UNDER_REVIEW" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "SELECTED" | "JOINING_SCHEDULED" | "JOINED" | "REJECTED" | "WITHDRAWN";
export type LeadStatus = "NEW" | "CONTACTED" | "VERIFIED" | "APPROVED" | "RECRUITING" | "FILLED" | "CLOSED" | "REJECTED" | "ON_HOLD";

export interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  city: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY";
  vacancies: number;
  status: JobStatus;
  urgent: boolean;
  postedAt: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  statusHistory: Array<{ status: ApplicationStatus; at: string }>;
  appliedAt: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  preferredRole?: string;
  city?: string;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "BLOCKED";
  createdAt: string;
}

export interface EmployerRequirement {
  id: string;
  company: string;
  contactName: string;
  mobile: string;
  jobTitle: string;
  category: string;
  candidatesRequired: number;
  city: string;
  status: LeadStatus;
  createdAt: string;
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
  createdAt: string;
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
  createdAt: string;
}

const jobs: Job[] = [
  { id: "JOB-10001", title: "Security Guard", company: "SecurePoint Facilities", category: "Security", city: "Raipur", district: "Raipur", salaryMin: 13000, salaryMax: 16000, employmentType: "FULL_TIME", vacancies: 50, status: "PUBLISHED", urgent: true, postedAt: "2026-08-18T09:00:00.000Z" },
  { id: "JOB-10002", title: "Office Assistant", company: "Aarav Enterprises", category: "Office Jobs", city: "Bhilai", district: "Durg", salaryMin: 11000, salaryMax: 14000, employmentType: "FULL_TIME", vacancies: 3, status: "PUBLISHED", urgent: false, postedAt: "2026-08-17T09:00:00.000Z" },
  { id: "JOB-10003", title: "Patient Care Attendant", company: "CareFirst Services", category: "Healthcare", city: "Raipur", district: "Raipur", salaryMin: 14000, salaryMax: 18000, employmentType: "FULL_TIME", vacancies: 12, status: "PUBLISHED", urgent: false, postedAt: "2026-08-16T09:00:00.000Z" },
];

const candidates: Candidate[] = [];
const applications: Application[] = [];
const employerRequirements: EmployerRequirement[] = [];
const serviceRequests: ServiceRequest[] = [];
const announcements: Announcement[] = [{ id: "ANN-100001", title: "Urgent Hiring: 50 Security Guards Required in Raipur", link: "/jobs/JOB-10001", active: true, createdAt: "2026-08-18T09:00:00.000Z" }];
const websitePosts: WebsitePost[] = [{ id: "POST-100001", title: "How to prepare for your first interview", excerpt: "Five practical tips for candidates applying to local opportunities.", category: "JOB_TIP", published: true, createdAt: "2026-08-17T09:00:00.000Z" }];
const notifications: NotificationMessage[] = [];

const nextId = (prefix: string, count: number) => `${prefix}-${String(count + 100001).padStart(6, "0")}`;

export const portalStore = {
  listPublishedJobs(query?: string, city?: string) {
    const normalizedQuery = query?.trim().toLowerCase();
    const normalizedCity = city?.trim().toLowerCase();
    return jobs.filter((job) => job.status === "PUBLISHED" && (!normalizedQuery || `${job.title} ${job.category} ${job.company}`.toLowerCase().includes(normalizedQuery)) && (!normalizedCity || job.city.toLowerCase() === normalizedCity));
  },
  getPublishedJob(jobId: string) {
    return jobs.find((job) => job.id === jobId && job.status === "PUBLISHED");
  },
  getAdminDashboard() {
    return {
      metrics: { activeJobs: jobs.filter((job) => job.status === "PUBLISHED").length, candidates: candidates.length, applications: applications.length, newRequirements: employerRequirements.filter((requirement) => requirement.status === "NEW").length, serviceRequests: serviceRequests.filter((request) => request.status === "NEW").length },
      jobs,
      announcements,
      websitePosts,
      notifications,
      employerRequirements,
      serviceRequests,
    };
  },
  createAnnouncement(input: Pick<Announcement, "title" | "link">) {
    const announcement: Announcement = { id: nextId("ANN", announcements.length), title: input.title, link: input.link, active: true, createdAt: new Date().toISOString() };
    announcements.unshift(announcement);
    return announcement;
  },
  createWebsitePost(input: Pick<WebsitePost, "title" | "excerpt" | "category">) {
    const post: WebsitePost = { id: nextId("POST", websitePosts.length), ...input, published: true, createdAt: new Date().toISOString() };
    websitePosts.unshift(post);
    return post;
  },
  createNotification(input: Omit<NotificationMessage, "id" | "createdAt">) {
    const notification: NotificationMessage = { id: nextId("NOT", notifications.length), ...input, createdAt: new Date().toISOString() };
    notifications.unshift(notification);
    return notification;
  },
  updateJobStatus(jobId: string, status: JobStatus) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) throw new Error("JOB_NOT_FOUND");
    job.status = status;
    return job;
  },
  createCandidate(input: Omit<Candidate, "id" | "verificationStatus" | "createdAt">) {
    if (candidates.some((candidate) => candidate.mobile === input.mobile)) throw new Error("DUPLICATE_MOBILE");
    const candidate: Candidate = { ...input, id: nextId("CGC", candidates.length), verificationStatus: "PENDING", createdAt: new Date().toISOString() };
    candidates.push(candidate);
    return candidate;
  },
  createApplication(candidateId: string, jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job || job.status !== "PUBLISHED") throw new Error("JOB_NOT_AVAILABLE");
    if (applications.some((application) => application.candidateId === candidateId && application.jobId === jobId)) throw new Error("DUPLICATE_APPLICATION");
    const appliedAt = new Date().toISOString();
    const application: Application = { id: nextId("APP", applications.length), candidateId, jobId, status: "APPLIED", statusHistory: [{ status: "APPLIED", at: appliedAt }], appliedAt };
    applications.push(application);
    return application;
  },
  createEmployerRequirement(input: Omit<EmployerRequirement, "id" | "status" | "createdAt">) {
    const requirement: EmployerRequirement = { ...input, id: nextId("REQ", employerRequirements.length), status: "NEW", createdAt: new Date().toISOString() };
    employerRequirements.push(requirement);
    return requirement;
  },
  createServiceRequest(input: Omit<ServiceRequest, "id" | "status" | "createdAt">) {
    const request: ServiceRequest = { ...input, id: nextId("SRV", serviceRequests.length), status: "NEW", createdAt: new Date().toISOString() };
    serviceRequests.push(request);
    return request;
  },
};