import { randomUUID } from "node:crypto";
import { portalStore, type Address, type Candidate, type CandidateDocument, type CandidateDocumentType, type CandidateEducation, type CandidateExperience, type CandidatePrivacyRequest, type JobPreference } from "@/lib/portal";
import { DOCUMENT_CONSENT_VERSION, PRIVACY_POLICY_VERSION, TERMS_VERSION, retentionReviewDate } from "@/lib/privacy";
import { createCloudinaryStorageKey, createDownloadUrl, createUploadSignature, deleteObject, DOCUMENT_UPLOAD_RULES, headObject, storageKeyBelongsTo } from "@/lib/storage";
import type { authenticate } from "./auth";
import { interviewView, jobView, MobileError, readBody, textField } from "./contracts";

type CandidateSession = Extract<Awaited<ReturnType<typeof authenticate>>, { kind: "candidate" }>;
const qualifications = ["Below 8th", "8th Pass", "10th Pass", "12th Pass", "ITI", "Diploma", "Graduate", "Post Graduate", "Other"];
const routes: Record<string, readonly string[]> = {
  dashboard: ["GET"], "profile-edit": ["GET", "PATCH"], education: ["GET", "POST"], experience: ["GET", "POST"], address: ["POST"], "job-preference": ["POST"],
  documents: ["GET", "DELETE"], "documents/presign": ["POST"], "documents/confirm": ["POST"], "documents/download": ["POST"],
  notifications: ["GET"], "notifications/read": ["POST"], privacy: ["GET", "PATCH", "POST", "DELETE"], "privacy/export": ["GET"],
};
const json = (data: unknown, status = 200) => Response.json({ data }, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
function keys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new MobileError("Request contains unsupported fields.");
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MobileError(`Invalid ${label}.`);
  return value as Record<string, unknown>;
}
function optional(body: Record<string, unknown>, key: string, max = 150) { return body[key] === undefined ? undefined : textField(body, key, 0, max); }
function numeric(body: Record<string, unknown>, key: string, max: number) {
  if (body[key] === undefined) return undefined;
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw new MobileError(`Invalid ${key}.`);
  return value;
}
function boolean(body: Record<string, unknown>, key: string) {
  if (body[key] !== undefined && typeof body[key] !== "boolean") throw new MobileError(`Invalid ${key}.`);
  return body[key] as boolean | undefined;
}
function choice<T extends string>(body: Record<string, unknown>, key: string, values: readonly T[]): T | undefined {
  const value = optional(body, key);
  if (!value) return undefined;
  if (!values.includes(value as T)) throw new MobileError(`Invalid ${key}.`);
  return value as T;
}
function addressView(a?: Address) { return a ? { line1: a.line1, city: a.city, state: a.state, district: a.district, pincode: a.pincode } : undefined; }
function preferenceView(p?: JobPreference) { return p ? { category: p.category, role: p.role, location: p.location, expectedSalaryMin: p.expectedSalaryMin, expectedSalaryMax: p.expectedSalaryMax, jobType: p.jobType, shift: p.shift, immediateJoining: p.immediateJoining } : undefined; }
function consentView(c?: Candidate["consents"]) { return c ? { privacyPolicyVersion: c.privacyPolicyVersion, privacyAcceptedAt: c.privacyAcceptedAt, termsVersion: c.termsVersion, termsAcceptedAt: c.termsAcceptedAt, documentProcessingVersion: c.documentProcessingVersion, documentProcessingAcceptedAt: c.documentProcessingAcceptedAt } : undefined; }
function profileView(c: Candidate) {
  return { id: c.id, fullName: c.fullName, mobile: c.mobile, email: c.email, city: c.city, preferredRole: c.preferredRole, verificationStatus: c.verificationStatus,
    availability: c.availability, profileCompletion: c.profileCompletion ?? 0, experienceType: c.experienceType, totalExperienceYears: c.totalExperienceYears,
    highestQualification: c.highestQualification, currentAddress: addressView(c.currentAddress), permanentAddress: c.permanentAddress ? { ...addressView(c.permanentAddress), sameAsCurrent: c.permanentAddress.sameAsCurrent } : undefined,
    jobPreference: preferenceView(c.jobPreference), resumeUploaded: c.resumeUploaded, identityDocumentsUploaded: c.identityDocumentsUploaded, createdAt: c.createdAt, updatedAt: c.updatedAt };
}
function educationView(e: CandidateEducation | null) { return e ? { qualification: e.qualification, course: e.course, specialization: e.specialization, institution: e.institution, passingYear: e.passingYear, percentage: e.percentage } : null; }
function experienceView(e: CandidateExperience | null) { return e ? { company: e.company, jobRole: e.jobRole, salary: e.salary, startDate: e.startDate, endDate: e.endDate, responsibilities: e.responsibilities } : null; }
function documentView(d: Omit<CandidateDocument, "storageKey">) { return { type: d.type, status: d.status, rejectionReason: d.rejectionReason, createdAt: d.createdAt, updatedAt: d.updatedAt, retentionReviewAt: d.retentionReviewAt, consentVersion: d.consentVersion, consentAcceptedAt: d.consentAcceptedAt }; }
function requestView(r: CandidatePrivacyRequest | null) { return r ? { id: r.id, type: r.type, status: r.status, reason: r.reason, createdAt: r.createdAt, updatedAt: r.updatedAt } : null; }
async function privacyView(id: string) {
  const data = await portalStore.getCandidatePrivacySummary(id);
  return { consents: consentView(data.consents), accountCreatedAt: data.accountCreatedAt, retentionReviewAt: data.retentionReviewAt, latestRequest: requestView(data.latestRequest), currentVersions: { privacyPolicy: PRIVACY_POLICY_VERSION, terms: TERMS_VERSION } };
}
function parseAddress(value: unknown, permanent = false) {
  const body = object(value, "address");
  keys(body, ["line1", "city", "state", "district", "pincode", ...(permanent ? ["sameAsCurrent"] : [])]);
  const pincode = optional(body, "pincode", 6);
  if (pincode && !/^[1-9]\d{5}$/.test(pincode)) throw new MobileError("Enter a valid six-digit pincode.");
  return { line1: optional(body, "line1", 300), city: textField(body, "city", 2, 100), state: optional(body, "state", 100), district: optional(body, "district", 100), pincode };
}
function documentType(body: Record<string, unknown>): CandidateDocumentType {
  const type = textField(body, "type");
  if (!Object.hasOwn(DOCUMENT_UPLOAD_RULES, type)) throw new MobileError("Unknown document type.");
  return type as CandidateDocumentType;
}
function checkPrivateKey(key: string, id: string, type: CandidateDocumentType) {
  if (!/^cloudinary:(image|raw):authenticated:/.test(key) || !storageKeyBelongsTo(key, `candidates/${id}/${type}/`)) throw new MobileError("This document is not available through private storage.", 403);
}

/** Pass the full catch-all path after bearer authentication and candidate-role narrowing. */
export async function candidatePages(request: Request, path: string[], session: CandidateSession): Promise<Response | null> {
  if (path[0] !== "candidate") return null;
  const route = path.slice(1).join("/");
  if (!Object.hasOwn(routes, route)) return null;
  if (session.kind !== "candidate" || !session.user.id) throw new MobileError("Candidate access required.", 403);
  if (!routes[route].includes(request.method)) return Response.json({ error: "Method not allowed." }, { status: 405, headers: { Allow: routes[route].join(", "), "Cache-Control": "private, no-store" } });
  const id = session.user.id;
  const candidate = await portalStore.getCandidateById(id);
  if (!candidate || candidate.verificationStatus === "BLOCKED") throw new MobileError("Please sign in again.", 401);
  const method = request.method;
  if (route === "dashboard") {
    const [applications, interviews, saved, notifications] = await Promise.all([portalStore.listCandidateApplications(id), portalStore.listCandidateInterviews(id), portalStore.listSavedJobIds(id), portalStore.listCandidateNotifications(id)]);
    const upcoming = interviews.filter(i => ["SCHEDULED", "RESCHEDULED"].includes(i.status) && Date.parse(i.scheduledAt) >= Date.now()).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
    return json({ candidate: profileView(candidate), counts: { applications: applications.length, interviews: upcoming.length, saved: saved.length, unread: notifications.filter(n => !n.read).length }, nextInterview: upcoming[0] ? interviewView(upcoming[0]) : null,
      applications: applications.slice(0, 5).map(a => ({ id: a.id, status: a.status, appliedAt: a.appliedAt, job: a.job ? jobView(a.job) : null })) });
  }
  if (route === "profile-edit" && method === "GET") {
    const [education, experience] = await Promise.all([portalStore.getCandidateEducation(id), portalStore.getCandidateExperience(id)]);
    return json({ candidate: profileView(candidate), education: educationView(education), experience: experienceView(experience) });
  }
  if (route === "education" && method === "GET") return json(educationView(await portalStore.getCandidateEducation(id)));
  if (route === "experience" && method === "GET") return json({ ...experienceView(await portalStore.getCandidateExperience(id)), experienceType: candidate.experienceType, totalExperienceYears: candidate.totalExperienceYears });
  if (route === "documents" && method === "GET") return json({ documents: (await portalStore.listCandidateDocuments(id)).map(documentView), rules: DOCUMENT_UPLOAD_RULES, consent: { accepted: candidate.consents?.documentProcessingVersion === DOCUMENT_CONSENT_VERSION, acceptedAt: candidate.consents?.documentProcessingAcceptedAt, version: DOCUMENT_CONSENT_VERSION } });
  if (route === "notifications" && method === "GET") return json((await portalStore.listCandidateNotifications(id)).map(n => ({ id: n.id, title: n.title, message: n.message, read: n.read, createdAt: n.createdAt })));
  if (route === "privacy" && method === "GET") return json(await privacyView(id));
  if (route === "privacy/export") {
    const data = await portalStore.getCandidateDataExport(id);
    return json({ exportedAt: data.exportedAt, candidate: { ...profileView(data.candidate), consents: consentView(data.candidate.consents), retentionReviewAt: data.candidate.retentionReviewAt, deletionRequestedAt: data.candidate.deletionRequestedAt },
      education: educationView(data.education), experience: experienceView(data.experience), documents: data.documents.map(documentView),
      applications: data.applications.map(a => ({ id: a.id, jobId: a.jobId, status: a.status, appliedAt: a.appliedAt, statusHistory: a.statusHistory.map(h => ({ status: h.status, at: h.at })) })),
      interviews: data.interviews.map(i => ({ ...interviewView(i), jobId: i.jobId, applicationId: i.applicationId })), savedJobs: data.savedJobs.map(s => ({ jobId: s.jobId, createdAt: s.createdAt })), privacyRequests: data.privacyRequests.map(requestView) });
  }
  if (route === "privacy" && method === "DELETE") {
    try { return json(requestView(await portalStore.cancelCandidateDataDeletionRequest(id))); }
    catch (error) { if (error instanceof Error && error.message === "PRIVACY_REQUEST_NOT_FOUND") throw new MobileError("No submitted request can be cancelled. A request under review cannot be cancelled.", 409); throw error; }
  }
  const body = await readBody(request);
  if (route === "profile-edit") {
    keys(body, ["email", "city", "preferredRole"]);
    const email = optional(body, "email", 254);
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new MobileError("Enter a valid email address.");
    // The existing basic-profile operation does not support clearing these fields.
    const city = body.city === undefined ? undefined : textField(body, "city", 2, 100);
    const preferredRole = body.preferredRole === undefined ? undefined : textField(body, "preferredRole", 2, 100);
    return json(profileView(await portalStore.updateCandidateProfile(id, { email, city, preferredRole })));
  }
  if (route === "education") {
    keys(body, ["qualification", "course", "specialization", "institution", "passingYear", "percentage"]);
    const qualification = textField(body, "qualification", 1, 100);
    if (!qualifications.includes(qualification)) throw new MobileError("Select a listed qualification.");
    const passingYear = optional(body, "passingYear", 4);
    if (passingYear && (!/^\d{4}$/.test(passingYear) || +passingYear < 1900 || +passingYear > new Date().getFullYear() + 10)) throw new MobileError("Enter a valid passing year.");
    const percentage = optional(body, "percentage", 40);
    return json(profileView(await portalStore.upsertCandidateEducation(id, { qualification, course: optional(body, "course"), specialization: optional(body, "specialization"), institution: optional(body, "institution", 250), passingYear, percentage })));
  }
  if (route === "experience") {
    keys(body, ["experienceType", "totalExperienceYears", "company", "jobRole", "salary", "startDate", "endDate", "responsibilities"]);
    const experienceType = choice(body, "experienceType", ["FRESHER", "EXPERIENCED"] as const);
    if (!experienceType) throw new MobileError("Select fresher or experienced.");
    const totalExperienceYears = numeric(body, "totalExperienceYears", 80);
    const startDate = optional(body, "startDate", 10), endDate = optional(body, "endDate", 10);
    for (const date of [startDate, endDate]) if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10))) throw new MobileError("Employment dates must be valid past dates (YYYY-MM-DD).");
    if (endDate && (!startDate || endDate < startDate)) throw new MobileError("End date must be on or after the start date.");
    const details = { company: optional(body, "company", 250), jobRole: optional(body, "jobRole"), salary: optional(body, "salary", 80), startDate, endDate, responsibilities: optional(body, "responsibilities", 3000) };
    return json(profileView(await portalStore.upsertCandidateExperience(id, { experienceType, totalExperienceYears: experienceType === "FRESHER" ? 0 : totalExperienceYears, ...(experienceType === "EXPERIENCED" ? details : {}) })));
  }
  if (route === "address") {
    keys(body, ["currentAddress", "permanentAddress"]);
    const currentAddress = parseAddress(body.currentAddress);
    const permanent = body.permanentAddress === undefined ? undefined : object(body.permanentAddress, "permanent address");
    if (permanent) keys(permanent, ["line1", "city", "state", "district", "pincode", "sameAsCurrent"]);
    const sameAsCurrent = permanent ? boolean(permanent, "sameAsCurrent") : undefined;
    const permanentAddress = permanent ? { ...(sameAsCurrent ? currentAddress : parseAddress(permanent, true)), sameAsCurrent: sameAsCurrent ?? false } : undefined;
    return json(profileView(await portalStore.updateCandidateAddress(id, { currentAddress, permanentAddress })));
  }
  if (route === "job-preference") {
    keys(body, ["category", "role", "location", "expectedSalaryMin", "expectedSalaryMax", "jobType", "shift", "immediateJoining"]);
    const expectedSalaryMin = numeric(body, "expectedSalaryMin", 100000000), expectedSalaryMax = numeric(body, "expectedSalaryMax", 100000000);
    if (expectedSalaryMin !== undefined && expectedSalaryMax !== undefined && expectedSalaryMax < expectedSalaryMin) throw new MobileError("Maximum salary must be at least the minimum salary.");
    return json(profileView(await portalStore.updateCandidateJobPreference(id, { category: optional(body, "category"), role: textField(body, "role", 2, 150), location: optional(body, "location"), expectedSalaryMin, expectedSalaryMax,
      jobType: choice(body, "jobType", ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"] as const), shift: choice(body, "shift", ["DAY", "NIGHT", "ROTATIONAL"] as const), immediateJoining: boolean(body, "immediateJoining") ?? false })));
  }
  if (route === "notifications/read") {
    keys(body, ["notificationId", "all"]);
    const all = boolean(body, "all");
    if (all) { if (body.notificationId !== undefined) throw new MobileError("Choose one notification or all."); await portalStore.markAllNotificationsRead(id); }
    else {
      const notificationId = textField(body, "notificationId");
      if (!(await portalStore.listCandidateNotifications(id)).some(n => n.id === notificationId)) throw new MobileError("Notification not found.", 404);
      await portalStore.markNotificationRead(id, notificationId);
    }
    return json({ success: true });
  }
  if (route === "privacy") {
    if (method === "PATCH") {
      keys(body, ["privacyConsent", "termsAccepted"]);
      if (body.privacyConsent !== true || body.termsAccepted !== true) throw new MobileError("Accept both the Privacy Policy and Terms.");
      const acceptedAt = new Date().toISOString();
      await portalStore.recordCandidatePolicyConsent(id, PRIVACY_POLICY_VERSION, TERMS_VERSION, acceptedAt, retentionReviewDate(new Date(acceptedAt)));
      return json(await privacyView(id));
    }
    keys(body, ["confirmation", "reason"]);
    if (body.confirmation !== "DELETE") throw new MobileError("Type DELETE to confirm your deletion request.");
    const reason = optional(body, "reason", 500);
    try { return json(requestView(await portalStore.createCandidateDataDeletionRequest(id, reason)), 201); }
    catch (error) { if (error instanceof Error && error.message === "PRIVACY_REQUEST_EXISTS") throw new MobileError("A deletion request is already being reviewed.", 409); throw error; }
  }
  if (route === "documents/presign") {
    keys(body, ["type", "fileName", "contentType", "fileSize", "consent"]);
    const type = documentType(body), rules = DOCUMENT_UPLOAD_RULES[type];
    const contentType = textField(body, "contentType"), fileName = textField(body, "fileName", 1, 255);
    if (!rules.mimeTypes.includes(contentType)) throw new MobileError("This file type is not allowed for the selected document.");
    const size = numeric(body, "fileSize", rules.maxSizeBytes);
    if (!size || !Number.isSafeInteger(size)) throw new MobileError("Choose a non-empty file within the size limit.");
    if (body.consent !== true) throw new MobileError("Document processing consent is required.");
    const resourceType = contentType.startsWith("image/") || contentType === "application/pdf" ? "image" : "raw";
    const extension = resourceType === "raw" ? contentType === "application/msword" ? ".doc" : ".docx" : "";
    const name = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60) || "document";
    const publicId = `candidates/${id}/${type}/${Date.now()}-${randomUUID()}-${name}${extension}`;
    let signature: ReturnType<typeof createUploadSignature>;
    try { signature = createUploadSignature(publicId, resourceType, "authenticated"); }
    catch { throw new MobileError("Private document storage is unavailable. Please try again later.", 503); }
    await portalStore.recordCandidateDocumentConsent(id, DOCUMENT_CONSENT_VERSION, new Date().toISOString());
    return json({ ...signature, resourceType });
  }
  if (route === "documents/confirm") {
    keys(body, ["type", "publicId", "resourceType", "deliveryType"]);
    const type = documentType(body), publicId = textField(body, "publicId", 1, 500);
    if ((body.resourceType !== "image" && body.resourceType !== "raw") || body.deliveryType !== "authenticated") throw new MobileError("Invalid private upload.");
    if (candidate.consents?.documentProcessingVersion !== DOCUMENT_CONSENT_VERSION) throw new MobileError("Document consent is required.");
    const provisionalKey = createCloudinaryStorageKey({ publicId, resourceType: body.resourceType, deliveryType: "authenticated", format: "" });
    checkPrivateKey(provisionalKey, id, type);
    const fileName = publicId.slice(`candidates/${id}/${type}/`.length);
    if (!/^[a-zA-Z0-9_-]+(?:\.(?:doc|docx))?$/.test(fileName)) throw new MobileError("Invalid document upload path.");
    const head = await headObject(provisionalKey);
    if (!head || !head.ContentLength || !Number.isSafeInteger(head.ContentLength) || head.ContentLength < 1) throw new MobileError("Upload could not be verified. Retry confirmation or upload again.");
    // Never trust a client-supplied format. Raw Word assets retain their signed extension.
    const format = (head.Format || (body.resourceType === "raw" ? publicId.split(".").pop() : "") || "").toLowerCase();
    const mime: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
    const expectedResource = format === "doc" || format === "docx" ? "raw" : "image";
    const rules = DOCUMENT_UPLOAD_RULES[type];
    if (!rules.mimeTypes.includes(mime[format]) || expectedResource !== body.resourceType || head.ContentLength > rules.maxSizeBytes) throw new MobileError("Uploaded file does not meet the document format or size requirements.");
    const storageKey = createCloudinaryStorageKey({ publicId, resourceType: body.resourceType, deliveryType: "authenticated", format });
    // A storage key contains no content version/digest. Never use key equality as
    // evidence that the reviewed bytes are unchanged (including legacy uploads
    // signed before overwrite=false). Match web confirmation: re-queue review.
    const acceptedAt = new Date().toISOString();
    const result = await portalStore.confirmCandidateDocument(id, type, storageKey, DOCUMENT_CONSENT_VERSION, acceptedAt, retentionReviewDate(new Date(acceptedAt)));
    if (result.replacedStorageKey && result.replacedStorageKey !== storageKey) await deleteObject(result.replacedStorageKey);
    return json(profileView(result.candidate));
  }
  if (route === "documents" || route === "documents/download") {
    keys(body, ["type"]);
    const type = documentType(body), document = await portalStore.getCandidateDocument(id, type);
    if (!document) throw new MobileError("Document not found.", 404);
    checkPrivateKey(document.storageKey, id, type);
    if (route === "documents") {
      if (!await deleteObject(document.storageKey)) throw new MobileError("Storage could not delete the file. Please retry.", 503);
      await portalStore.deleteCandidateDocument(id, type);
      return json({ deleted: true });
    }
    let url: string;
    try { url = await createDownloadUrl(document.storageKey); }
    catch { throw new MobileError("Private document storage is unavailable.", 503); }
    await portalStore.logCandidateDocumentAccess(id, "CANDIDATE", id, type);
    return json({ url, expiresIn: 300 });
  }
  return null;
}
