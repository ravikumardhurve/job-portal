import type { Candidate, Interview, Job } from "@/lib/portal";

export class MobileError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function textField(body: Record<string, unknown>, key: string, min = 1, max = 150): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new MobileError(`Please enter a valid ${key}.`);
  return value.trim();
}

export function numberField(body: Record<string, unknown>, key: string, min = 0): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) throw new MobileError(`Invalid ${key}.`);
  return value;
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 16000) throw new MobileError("Request is too large.", 413);
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new MobileError("Invalid JSON request."); }
}

export function candidateView(c: Candidate) {
  return { id: c.id, fullName: c.fullName, mobile: c.mobile, email: c.email, city: c.city, preferredRole: c.preferredRole, verificationStatus: c.verificationStatus, profileCompletion: c.profileCompletion ?? 0, availability: c.availability, currentAddress: c.currentAddress, jobPreference: c.jobPreference, highestQualification: c.highestQualification };
}

export function jobView(j: Job) {
  return { id: j.id, title: j.title, company: j.company, city: j.city, district: j.district, category: j.category, salaryMin: j.salaryMin, salaryMax: j.salaryMax, employmentType: j.employmentType, vacancies: j.vacancies, status: j.status, urgent: j.urgent, postedAt: j.postedAt, description: j.description, qualification: j.qualification, shift: j.shift, applicationDeadline: j.applicationDeadline, benefits: j.benefits };
}

export function interviewView(i: Interview & { job?: Job }) {
  return { id: i.id, job: i.job ? jobView(i.job) : undefined, scheduledAt: i.scheduledAt, mode: i.mode, status: i.status, address: i.address, meetingLink: i.meetingLink, contactPerson: i.contactPerson, contactMobile: i.contactMobile, instructions: i.instructions, cancelReason: i.cancelReason };
}

export function paging(url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new MobileError("Invalid page.");
  return { page, pageSize: 20 };
}

export const serviceTypes = ["SECURITY", "BABY_CARE", "CARETAKER", "HOUSEKEEPING", "PEST_CONTROL", "MANPOWER", "OTHER"] as const;
