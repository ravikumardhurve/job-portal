import { MongoServerError } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { jobScopeFilter, serviceTypesForScope, isBusinessVertical, normalizeBusinessVerticals, inferBusinessVertical } from "@/lib/admin-scope";
import { changeAdminPassword, createPartnerAdmin, listAdminUsers, updateAdminUserStatus } from "@/lib/admin-users";
import { listAuditLogs, recordAudit, updateCandidateAdminFields } from "@/lib/admin-operations";
import { parseAdminJobInput, type AdminJobBody } from "@/lib/admin-job-input";
import { portalStore, type Application, type Candidate, type Job, type SiteSettings } from "@/lib/portal";
import { createDownloadUrl } from "@/lib/storage";
import type { authenticate } from "./auth";
import { candidateView, jobView, MobileError, paging, readBody, textField } from "./contracts";

/** Call after bearer authentication, before generic admin list/status dispatch.
 * Paths include the leading "admin". No web routes or cookie sessions are used.
 */
export type AuthenticatedAdmin = Extract<Awaited<ReturnType<typeof authenticate>>, { kind: "admin" }>;

const settingsKeys = ["companyName", "tagline", "homeAnnouncementText", "homeHeroBadge", "homeHeroTitle", "homeHeroHighlight", "homeHeroDescription", "homeServicesTitle", "homeServicesDescription", "homeJobsTitle", "homeJobsDescription", "homeCtaTitle", "homeCtaDescription", "metaTitle", "metaDescription", "phone", "whatsapp", "email", "address", "city", "state", "postalCode", "workingHours", "facebookUrl", "instagramUrl", "googleBusinessProfileUrl", "gstNumber"] as const;
const documentTypes = ["RESUME", "AADHAAR_FRONT", "AADHAAR_BACK", "PAN", "PHOTO", "POLICE_VERIFICATION", "EXPERIENCE_CERTIFICATE", "EDUCATION_CERTIFICATE", "OTHER"] as const;
const documentFields = ["type", "status", "rejectionReason", "createdAt", "verifiedAt"];
const reportColumns = {
  candidates: ["id", "fullName", "mobile", "email", "city", "verificationStatus", "availability", "createdAt"],
  applications: ["id", "candidateId", "jobId", "status", "appliedAt"],
  jobs: ["id", "title", "company", "city", "category", "status", "vacancies", "salaryMin", "salaryMax", "postedAt"],
  "service-requests": ["id", "customerName", "mobile", "serviceType", "city", "status", "createdAt"],
} as const;

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
function pick(value: object, keys: readonly string[]) {
  const source = value as Record<string, unknown>;
  return Object.fromEntries(keys.map(key => [key, source[key]]));
}
function only(body: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(body).some(key => !keys.includes(key))) throw new MobileError("Unsupported field in request.");
}
function choice<T extends string>(value: unknown, values: readonly T[], field: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new MobileError(`Invalid ${field}.`);
  return value as T;
}
function optionalText(body: Record<string, unknown>, key: string, max = 500) {
  return body[key] === undefined ? undefined : textField(body, key, 0, max);
}
function day(value: string | null, field: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new MobileError(`Invalid ${field}; use YYYY-MM-DD.`);
  return value;
}
function dates(url: URL) {
  const from = day(url.searchParams.get("from"), "from date");
  const to = day(url.searchParams.get("to"), "to date");
  if (from && to && from > to) throw new MobileError("From date must precede to date.");
  return { from, to };
}
function password(body: Record<string, unknown>, key: string, min: number) {
  const value = body[key];
  if (typeof value !== "string" || value.length < min || Buffer.byteLength(value, "utf8") > 72) throw new MobileError(`${key} must have at least ${min} characters and at most 72 UTF-8 bytes.`);
  return value;
}
function pageRows<T>(rows: T[], url: URL, limit?: number) {
  const { page, pageSize } = paging(url);
  return { data: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, ...(limit ? { limit } : {}) };
}
function jobDto(job: Job) {
  return { ...jobView(job), businessVertical: job.businessVertical ?? inferBusinessVertical(job.category), jobRole: job.jobRole, minExperience: job.minExperience, maxExperience: job.maxExperience };
}
function candidateDto(candidate: Candidate) {
  return { ...candidateView(candidate), adminNotes: candidate.adminNotes ?? "", blockReason: candidate.blockReason ?? "" };
}
function settingsDto(settings: SiteSettings) { return pick(settings, settingsKeys); }

export async function adminPages(request: Request, path: string[], session: AuthenticatedAdmin): Promise<Response | null> {
  if (path[0] !== "admin") return null;
  const section = path[1];
  if (!["reports", "reviews", "audit-logs", "team", "account", "privacy-requests", "settings", "job-edit", "interview-schedule", "candidate-verify"].includes(section)) return null;
  try {
    if (session.kind !== "admin") throw new MobileError("Admin access required.", 403);
    const { user, scope } = session;
    const url = new URL(request.url);
    const method = request.method;
    const id = path[2];
    const documentRoute = section === "candidate-verify" && path[3] === "documents" && (path.length === 5 || (path.length === 6 && path[5] === "download"));
    if ((!documentRoute && path.length > 3) || (id !== undefined && !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) throw new MobileError("Endpoint not found.", 404);
    const roles = section === "team" || section === "audit-logs" ? ["SUPER_ADMIN"] : ["reviews", "privacy-requests", "settings"].includes(section) ? ["SUPER_ADMIN", "ADMIN"] : ["SUPER_ADMIN", "ADMIN", "RECRUITER", "PARTNER_ADMIN"];
    if (!roles.includes(user.role)) throw new MobileError("Your role cannot access this page.", 403);

    if (section === "account") {
      if (!id && method === "GET") return json({ data: pick(user, ["id", "name", "email", "role", "businessVerticals"]) });
      if (id === "password" && method === "PATCH") {
        const body = await readBody(request);
        only(body, ["currentPassword", "newPassword"]);
        const current = password(body, "currentPassword", 1);
        const next = password(body, "newPassword", 10);
        if (current === next) throw new MobileError("Choose a different new password.");
        await changeAdminPassword(user.id, current, next);
        // The auth module compares credential hashes on every bearer request.
        return json({ message: "Password changed. Sign in again on all mobile devices.", reauthenticate: true });
      }
    }

    if (section === "reports" && !id && method === "GET") {
      const type = choice(url.searchParams.get("type") ?? "jobs", ["candidates", "applications", "jobs", "service-requests"] as const, "report type");
      const { from, to } = dates(url);
      const { page, pageSize } = paging(url);
      const db = await getDatabase();
      const ids = scope.all ? undefined : (await db.collection<Job>("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray()).map(row => row.id);
      const candidateIds = type === "candidates" && ids ? await db.collection<Application>("applications").distinct("candidateId", { jobId: { $in: ids } }) : undefined;
      const types = serviceTypesForScope(scope);
      const field = type === "jobs" ? "postedAt" : type === "applications" ? "appliedAt" : "createdAt";
      const filter = {
        ...(type === "jobs" ? jobScopeFilter(scope) : type === "applications" ? (ids ? { jobId: { $in: ids } } : {}) : type === "candidates" ? { deletedAt: { $exists: false }, ...(candidateIds ? { id: { $in: candidateIds } } : {}) } : (types ? { serviceType: { $in: types } } : {})),
        ...(from || to ? { [field]: { ...(from ? { $gte: `${from}T00:00:00.000Z` } : {}), ...(to ? { $lte: `${to}T23:59:59.999Z` } : {}) } } : {}),
      };
      const collection = db.collection(type === "service-requests" ? "serviceRequests" : type);
      const columns = reportColumns[type];
      const [rows, total] = await Promise.all([
        collection.find(filter, { projection: { _id: 0, ...Object.fromEntries(columns.map(key => [key, 1])) } }).sort({ [field]: -1, id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
        collection.countDocuments(filter),
      ]);
      return json({ data: rows.map(row => pick(row, columns)), columns, total, page, pageSize });
    }

    if (section === "reviews") {
      const fields = ["id", "serviceSlug", "customerName", "city", "rating", "comment", "status", "createdAt"];
      if (!id && method === "GET") {
        const raw = url.searchParams.get("status");
        const status = raw ? choice(raw, ["PENDING", "APPROVED", "REJECTED"] as const, "review status") : undefined;
        return json(pageRows((await portalStore.listAdminServiceReviews(status)).map(row => pick(row, fields)), url, 200));
      }
      if (id && method === "PATCH") {
        const body = await readBody(request); only(body, ["status"]);
        const status = choice(body.status, ["APPROVED", "REJECTED"] as const, "review status");
        return json({ data: pick(await portalStore.updateServiceReviewStatus(id, status, user.id), fields) });
      }
    }

    if (section === "audit-logs" && !id && method === "GET") {
      const { from, to } = dates(url);
      const q = (url.searchParams.get("q") ?? "").trim();
      const action = (url.searchParams.get("action") ?? "").trim();
      if (q.length > 100 || action.length > 100) throw new MobileError("Search is too long.");
      const rows = await listAuditLogs({ q, action, from, to });
      return json(pageRows(rows.map(row => ({ ...pick(row, ["actorId", "action", "targetType", "targetId", "createdAt"]), actorName: row.actor?.name ?? row.actorId })), url, 500));
    }

    if (section === "team") {
      const view = (row: object) => pick(row, ["id", "name", "email", "role", "businessVerticals", "status", "lastLoginAt", "createdAt"]);
      if (!id && method === "GET") return json(pageRows((await listAdminUsers()).map(row => view({ ...row, businessVerticals: normalizeBusinessVerticals(row.businessVerticals) })), url));
      if (!id && method === "POST") {
        const body = await readBody(request); only(body, ["name", "email", "password", "businessVertical"]);
        const name = textField(body, "name", 1, 100);
        const email = textField(body, "email", 5, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MobileError("Enter a valid email.");
        if (!isBusinessVertical(body.businessVertical)) throw new MobileError("Choose a business field.");
        const data = await createPartnerAdmin({ name, email, password: password(body, "password", 10), businessVertical: body.businessVertical, createdBy: user.id });
        return json({ data: view(data) }, 201);
      }
      if (id && method === "PATCH") {
        const body = await readBody(request); only(body, ["status"]);
        const status = choice(body.status, ["ACTIVE", "SUSPENDED"] as const, "account status");
        return json({ data: view(await updateAdminUserStatus(id, status, user.id)) });
      }
    }

    if (section === "privacy-requests") {
      const fields = ["id", "candidateId", "type", "status", "reason", "resolutionNote", "createdAt"];
      if (!id && method === "GET") return json(pageRows((await portalStore.listAdminCandidatePrivacyRequests()).map(row => ({ ...pick(row, fields), candidateName: row.candidate?.fullName ?? row.candidateId })), url, 250));
      if (id && method === "PATCH") {
        const body = await readBody(request); only(body, ["status", "resolutionNote"]);
        // Completion includes irreversible storage cleanup; this extension deliberately does not expose it.
        const status = choice(body.status, ["IN_REVIEW", "REJECTED"] as const, "privacy review status");
        const note = optionalText(body, "resolutionNote", 500);
        if (status === "REJECTED" && !note) throw new MobileError("A rejection reason is required.");
        return json({ data: pick(await portalStore.updateCandidatePrivacyRequest(id, status, user.id, note), fields) });
      }
    }

    if (section === "settings" && !id) {
      if (method === "GET") return json({ data: settingsDto(await portalStore.getSiteSettings()) });
      if (method === "POST") {
        const body = await readBody(request); only(body, settingsKeys);
        if (!Object.keys(body).length) throw new MobileError("No changes supplied.");
        const patch: Partial<SiteSettings> = {};
        for (const key of settingsKeys) if (body[key] !== undefined) {
          const value = textField(body, key, key === "companyName" ? 1 : 0, key.includes("Description") || key === "address" ? 1500 : 300);
          if (value && key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new MobileError("Enter a valid contact email.");
          if (value && key.endsWith("Url")) { let link: URL; try { link = new URL(value); } catch { throw new MobileError(`Invalid ${key}.`); } if (!["http:", "https:"].includes(link.protocol) || link.username || link.password) throw new MobileError(`Invalid ${key}.`); }
          patch[key] = value;
        }
        return json({ data: settingsDto(await portalStore.updateSiteSettings(patch, user.email)), message: "Site text and contact settings updated." });
      }
    }

    if (section === "job-edit" && id && (method === "GET" || method === "PATCH")) {
      const current = await (await getDatabase()).collection<Job>("jobs").findOne({ id, ...jobScopeFilter(scope) });
      if (!current) throw new MobileError("Job not found.", 404);
      if (method === "GET") return json({ data: jobDto(current) });
      const body = await readBody(request);
      const stringFields = ["title", "company", "category", "city", "district", "description", "jobRole", "qualification", "applicationDeadline"];
      const numberFields = ["salaryMin", "salaryMax", "vacancies", "minExperience", "maxExperience"];
      only(body, [...stringFields, ...numberFields, "employmentType", "shift", "businessVertical", "urgent", "benefits", "publishNow"]);
      const patch: Record<string, unknown> = {};
      for (const key of stringFields) if (body[key] !== undefined) patch[key] = textField(body, key, ["title", "company", "category", "city", "district"].includes(key) ? 1 : 0, key === "description" ? 5000 : 300);
      for (const key of numberFields) if (body[key] !== undefined) {
        if (typeof body[key] !== "number" || !Number.isFinite(body[key]) || body[key] < 0) throw new MobileError(`Invalid ${key}.`);
        patch[key] = body[key];
      }
      if (body.employmentType !== undefined) patch.employmentType = choice(body.employmentType, ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"], "employment type");
      if (body.shift !== undefined) patch.shift = choice(body.shift, ["DAY", "NIGHT", "ROTATIONAL"], "shift");
      if (body.businessVertical !== undefined) { if (!isBusinessVertical(body.businessVertical)) throw new MobileError("Invalid business field."); patch.businessVertical = body.businessVertical; }
      for (const key of ["urgent", "publishNow"]) if (body[key] !== undefined) { if (typeof body[key] !== "boolean") throw new MobileError(`Invalid ${key}.`); patch[key] = body[key]; }
      if (body.benefits !== undefined) {
        if (!Array.isArray(body.benefits) || body.benefits.length > 30 || body.benefits.some(item => typeof item !== "string" || item.length > 200)) throw new MobileError("Invalid benefits.");
        patch.benefits = body.benefits.map(item => (item as string).trim()).filter(Boolean);
      }
      if (patch.applicationDeadline) day(String(patch.applicationDeadline), "application deadline");
      const parsed = parseAdminJobInput({ ...current, ...patch } as AdminJobBody, scope);
      if ("error" in parsed) throw new MobileError(parsed.error, parsed.status);
      const updated = await portalStore.updateAdminJob(id, parsed.data, scope, body.publishNow === true ? "PUBLISHED" : undefined);
      await recordAudit(user.id, "JOB_UPDATED", "JOB", id, { published: body.publishNow === true });
      return json({ data: jobDto(updated), message: "Job updated." });
    }

    if (documentRoute && id) {
      const type = choice(path[4], documentTypes, "document type");
      const downloading = path[5] === "download";
      if (method !== (downloading ? "POST" : "PATCH")) throw new MobileError("Method not supported.", 405);
      // Require a live scoped candidate before accessing a possibly retained document.
      await portalStore.getAdminCandidateDetails(id, scope);
      if (downloading) {
        const document = await portalStore.getAdminCandidateDocument(id, type, scope);
        let url: string;
        try {
          url = await createDownloadUrl(document.storageKey);
          if (new URL(url).protocol !== "https:") throw new Error("Invalid download protocol");
        } catch { throw new MobileError("Private document download is unavailable. Please retry.", 503); }
        await portalStore.logCandidateDocumentAccess(user.id, "ADMIN", id, type);
        return json({ data: { url } });
      }
      const body = await readBody(request); only(body, ["status", "rejectionReason"]);
      const status = choice(body.status, ["PENDING", "VERIFIED", "REJECTED"] as const, "document status");
      const reason = optionalText(body, "rejectionReason", 500);
      if (status === "REJECTED" && !reason) throw new MobileError("A document rejection reason is required.");
      const document = await portalStore.updateCandidateDocumentStatus(id, type, status, reason, user.email, scope);
      return json({ data: pick(document, documentFields) });
    }

    if (section === "candidate-verify" && id && (method === "GET" || method === "PATCH")) {
      const details = await portalStore.getAdminCandidateDetails(id, scope);
      if (method === "GET") return json({ data: { ...candidateDto(details.candidate), documents: details.documents.map(doc => pick(doc, documentFields)) } });
      const body = await readBody(request); only(body, ["verificationStatus", "availability", "blockReason", "adminNotes"]);
      const verificationStatus = choice(body.verificationStatus, ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "BLOCKED"] as const, "verification status");
      const availability = body.availability === undefined ? details.candidate.availability : choice(body.availability, ["AVAILABLE", "INTERVIEWING", "SELECTED", "WORKING", "NOT_AVAILABLE"] as const, "availability");
      const blockReason = optionalText(body, "blockReason", 500) ?? details.candidate.blockReason;
      const adminNotes = optionalText(body, "adminNotes", 2000) ?? details.candidate.adminNotes;
      return json({ data: candidateDto(await updateCandidateAdminFields(id, { verificationStatus, availability, blockReason, adminNotes }, user.id, scope)) });
    }

    if (section === "interview-schedule") {
      const db = await getDatabase();
      const jobs = scope.all ? undefined : (await db.collection<Job>("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray()).map(job => job.id);
      const filter = { status: "SHORTLISTED" as const, deletedAt: { $exists: false }, ...(jobs ? { jobId: { $in: jobs } } : {}) };
      if (method === "GET") {
        const { page, pageSize } = paging(url);
        const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const where = { ...filter, ...(id ? { id } : query ? { $or: ["id", "candidateId", "jobId"].map(key => ({ [key]: { $regex: query, $options: "i" } })) } : {}) };
        const collection = db.collection<Application>("applications");
        const [rows, total] = await Promise.all([collection.find(where, { projection: { _id: 0, id: 1, candidateId: 1, jobId: 1, status: 1, appliedAt: 1 } }).sort({ appliedAt: -1, id: 1 }).skip(id ? 0 : (page - 1) * pageSize).limit(id ? 1 : pageSize).toArray(), collection.countDocuments(where)]);
        if (id && !rows[0]) throw new MobileError("Shortlisted application not found.", 404);
        const data = rows.map(row => pick(row, ["id", "candidateId", "jobId", "status", "appliedAt"]));
        return json(id ? { data: data[0] } : { data, total, page, pageSize });
      }
      if (!id && method === "POST") {
        const body = await readBody(request); only(body, ["applicationId", "scheduledAt", "mode", "address", "meetingLink", "contactPerson", "contactMobile", "instructions"]);
        const applicationId = textField(body, "applicationId", 1, 100);
        const application = await db.collection<Application>("applications").findOne({ ...filter, id: applicationId }, { projection: { id: 1, candidateId: 1, jobId: 1 } });
        if (!application) throw new MobileError("Shortlisted application not found.", 404);
        const time = textField(body, "scheduledAt", 1, 50);
        if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(time) || !Number.isFinite(Date.parse(time)) || Date.parse(time) <= Date.now()) throw new MobileError("Enter a future interview time with a timezone.");
        day(time.slice(0, 10), "interview date");
        const mode = choice(body.mode, ["OFFLINE", "PHONE", "VIDEO"] as const, "interview mode");
        const address = optionalText(body, "address");
        const meetingLink = optionalText(body, "meetingLink", 1000);
        const contactPerson = optionalText(body, "contactPerson", 100);
        const contactMobile = optionalText(body, "contactMobile", 30);
        const instructions = optionalText(body, "instructions", 2000);
        if (mode === "OFFLINE" && !address) throw new MobileError("An address is required for an offline interview.");
        if (mode === "PHONE" && !contactMobile) throw new MobileError("A contact number is required for a phone interview.");
        if (contactMobile && !/^\+?[\d ()-]{7,30}$/.test(contactMobile)) throw new MobileError("Invalid contact number.");
        if (mode === "VIDEO" && !meetingLink) throw new MobileError("A meeting link is required for a video interview.");
        if (meetingLink) { let link: URL; try { link = new URL(meetingLink); } catch { throw new MobileError("Invalid meeting link."); } if (link.protocol !== "https:" || link.username || link.password) throw new MobileError("Use an HTTPS meeting link without credentials."); }
        const result = await portalStore.scheduleInterview({ applicationId, candidateId: application.candidateId, jobId: application.jobId, scheduledAt: new Date(time).toISOString(), mode, address, meetingLink, contactPerson, contactMobile, instructions }, scope);
        return json({ data: pick(result, ["id", "applicationId", "candidateId", "jobId", "scheduledAt", "mode", "status"]) }, 201);
      }
    }
    throw new MobileError("Method or endpoint not supported.", 405);
  } catch (error) {
    if (error instanceof MobileError) return json({ error: error.message }, error.status);
    if (error instanceof MongoServerError && error.code === 11000) return json({ error: "An account with this email already exists." }, 409);
    const known: Record<string, [number, string]> = {
      CURRENT_PASSWORD_INVALID: [400, "Current password is incorrect."], BLOCK_REASON_REQUIRED: [400, "A block reason is required."],
      ADMIN_USER_NOT_FOUND: [404, "Editable admin account not found."], SERVICE_REVIEW_NOT_FOUND: [404, "Review not found."],
      PRIVACY_REQUEST_NOT_FOUND: [404, "Privacy request is missing or already closed."], CANDIDATE_NOT_FOUND: [404, "Candidate not found."],
      JOB_NOT_FOUND: [404, "Job not found."], APPLICATION_NOT_FOUND: [404, "Shortlisted application not found."],
      DOCUMENT_NOT_FOUND: [404, "Document not found."],
    };
    const mapped = error instanceof Error ? known[error.message] : undefined;
    if (mapped) return json({ error: mapped[1] }, mapped[0]);
    throw error; // Existing mobile handler provides a sanitized 500 response.
  }
}
