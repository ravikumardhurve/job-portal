import type { Filter } from "mongodb";
import { businessVerticalForServiceType, inferBusinessVertical, jobScopeFilter, requirementScopeFilter, serviceTypesForScope, type AdminScope, type BusinessVertical } from "@/lib/admin-scope";
import { getDatabase, withMongoTransaction } from "@/lib/mongodb";
import type { Application, Candidate, EmployerRequirement, Interview, Job, LeadStatus, ServiceRequest } from "@/lib/portal";

export interface AuditLog {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  actor?: { name?: string; email?: string };
}

function dateFilter(field: string, from?: string, to?: string) {
  if (!from && !to) return {};
  const range: Record<string, string> = {};
  if (from) range.$gte = `${from}T00:00:00.000Z`;
  if (to) range.$lte = `${to}T23:59:59.999Z`;
  return { [field]: range };
}

async function scopedJobIds(scope: AdminScope) {
  if (scope.all) return undefined;
  const jobs = await (await getDatabase()).collection<Job>("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray();
  return jobs.map((job) => job.id);
}

async function canAccessCandidate(candidateId: string, scope: AdminScope) {
  if (scope.all) return true;
  const jobIds = await scopedJobIds(scope) ?? [];
  return Boolean(await (await getDatabase()).collection<Application>("applications").findOne({ candidateId, jobId: { $in: jobIds } }, { projection: { _id: 1 } }));
}

export async function recordAudit(actorId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}, ipAddress?: string) {
  await (await getDatabase()).collection("auditLogs").insertOne({ actorId, action, targetType, targetId, metadata, ...(ipAddress ? { ipAddress } : {}), createdAt: new Date().toISOString() });
}

export async function expireOverdueJobs(scope: AdminScope) {
  const today = new Date().toISOString().slice(0, 10);
  const result = await (await getDatabase()).collection<Job>("jobs").updateMany(
    { status: "PUBLISHED", applicationDeadline: { $lt: today }, ...jobScopeFilter(scope) },
    { $set: { status: "EXPIRED", updatedAt: new Date().toISOString() } },
  );
  return result.modifiedCount;
}

export async function duplicateJob(jobId: string, actorId: string, scope: AdminScope) {
  const db = await getDatabase();
  const source = await db.collection<Job>("jobs").findOne({ id: jobId, ...jobScopeFilter(scope) });
  if (!source) throw new Error("JOB_NOT_FOUND");
  const counter = await db.collection<{ _id: string; sequence: number }>("counters").findOneAndUpdate({ _id: "JOB" }, { $inc: { sequence: 1 } }, { upsert: true, returnDocument: "after" });
  const id = `JOB-${String((counter?.sequence ?? 0) + 100000).padStart(6, "0")}`;
  const postedAt = new Date().toISOString();
  const { _id: _ignored, ...copy } = source as Job & { _id?: unknown };
  void _ignored;
  const duplicate: Job = { ...copy, id, title: `${source.title} (Copy)`, status: "DRAFT", urgent: false, postedAt, updatedAt: postedAt, duplicatedFrom: source.id };
  delete duplicate.archivedAt;
  await Promise.all([
    db.collection<Job>("jobs").insertOne(duplicate),
    recordAudit(actorId, "JOB_DUPLICATED", "JOB", id, { sourceJobId: source.id }),
  ]);
  return duplicate;
}

export async function listEmployerRequirements(scope: AdminScope) {
  return (await getDatabase()).collection<EmployerRequirement>("employerRequirements").find(requirementScopeFilter(scope)).sort({ createdAt: -1 }).limit(500).toArray();
}

export async function updateEmployerRequirement(requirementId: string, input: { status: LeadStatus; assignedTo?: string; internalNotes?: string; nextFollowUpAt?: string }, actorId: string, scope: AdminScope) {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  const current = await db.collection<EmployerRequirement>("employerRequirements").findOne({ id: requirementId, ...requirementScopeFilter(scope) });
  if (!current) throw new Error("EMPLOYER_REQUIREMENT_NOT_FOUND");
  const updated = await db.collection<EmployerRequirement>("employerRequirements").findOneAndUpdate(
    { id: requirementId },
    { $set: { status: input.status, assignedTo: input.assignedTo?.trim() ?? "", internalNotes: input.internalNotes?.trim() ?? "", nextFollowUpAt: input.nextFollowUpAt ?? "", updatedAt } },
    { returnDocument: "after" },
  );
  await recordAudit(actorId, "EMPLOYER_REQUIREMENT_UPDATED", "EMPLOYER_REQUIREMENT", requirementId, { from: current.status, to: input.status, assignedTo: input.assignedTo ?? "" });
  return updated;
}

export async function updateInterview(interviewId: string, input: Partial<Pick<Interview, "scheduledAt" | "mode" | "status" | "address" | "meetingLink" | "contactPerson" | "contactMobile" | "instructions" | "internalNotes" | "cancelReason">>, actorId: string, scope: AdminScope) {
  return withMongoTransaction(async (db, session) => {
    const jobIds = await scopedJobIds(scope);
    const current = await db.collection<Interview>("interviews").findOne({ id: interviewId, ...(jobIds ? { jobId: { $in: jobIds } } : {}) }, { session });
    if (!current) throw new Error("INTERVIEW_NOT_FOUND");
    const updatedAt = new Date().toISOString();
    const status = input.status ?? (input.scheduledAt && input.scheduledAt !== current.scheduledAt ? "RESCHEDULED" : current.status);
    const patch = Object.fromEntries(Object.entries({ ...input, status, updatedAt }).filter(([, value]) => value !== undefined));
    const updated = await db.collection<Interview>("interviews").findOneAndUpdate({ id: interviewId }, { $set: patch }, { returnDocument: "after", session });
    const linked: Partial<Record<Interview["status"], Application["status"]>> = { COMPLETED: "INTERVIEWED", SELECTED: "SELECTED", REJECTED: "REJECTED" };
    if (linked[status]) await db.collection<Application>("applications").updateOne({ id: current.applicationId }, { $set: { status: linked[status], updatedAt }, $push: { statusHistory: { status: linked[status]!, at: updatedAt } } }, { session });
    await db.collection("auditLogs").insertOne({ actorId, action: current.scheduledAt !== input.scheduledAt && input.scheduledAt ? "INTERVIEW_RESCHEDULED" : "INTERVIEW_UPDATED", targetType: "INTERVIEW", targetId: interviewId, metadata: { fromStatus: current.status, toStatus: status }, createdAt: updatedAt }, { session });
    return updated;
  });
}

export async function updateServiceRequest(requestId: string, input: Partial<Pick<ServiceRequest, "status" | "assignedStaff" | "assignedVendor" | "scheduledAt" | "internalNotes">>, actorId: string, scope: AdminScope) {
  const db = await getDatabase();
  const allowedTypes = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined;
  const current = await db.collection<ServiceRequest>("serviceRequests").findOne({ id: requestId, ...(allowedTypes ? { serviceType: { $in: allowedTypes } } : {}) });
  if (!current) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  const updatedAt = new Date().toISOString();
  const patch = Object.fromEntries(Object.entries({ ...input, updatedAt }).filter(([, value]) => value !== undefined));
  const updated = await db.collection<ServiceRequest>("serviceRequests").findOneAndUpdate({ id: requestId }, { $set: patch }, { returnDocument: "after" });
  await recordAudit(actorId, "SERVICE_REQUEST_UPDATED", "SERVICE_REQUEST", requestId, { fromStatus: current.status, toStatus: input.status ?? current.status, assignmentChanged: current.assignedStaff !== input.assignedStaff || current.assignedVendor !== input.assignedVendor });
  return updated;
}

export async function updateCandidateAdminFields(candidateId: string, input: { verificationStatus: Candidate["verificationStatus"]; availability?: Candidate["availability"]; blockReason?: string; adminNotes?: string }, actorId: string, scope: AdminScope) {
  if (!await canAccessCandidate(candidateId, scope)) throw new Error("CANDIDATE_NOT_FOUND");
  if (input.verificationStatus === "BLOCKED" && !input.blockReason?.trim()) throw new Error("BLOCK_REASON_REQUIRED");
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  const updated = await db.collection<Candidate>("candidates").findOneAndUpdate(
    { id: candidateId, deletedAt: { $exists: false } },
    { $set: { verificationStatus: input.verificationStatus, ...(input.availability ? { availability: input.availability } : {}), adminNotes: input.adminNotes?.trim() ?? "", blockReason: input.verificationStatus === "BLOCKED" ? input.blockReason?.trim() : "", updatedAt } },
    { returnDocument: "after", projection: { passwordHash: 0 } },
  );
  if (!updated) throw new Error("CANDIDATE_NOT_FOUND");
  await recordAudit(actorId, "CANDIDATE_ADMIN_UPDATED", "CANDIDATE", candidateId, { verificationStatus: input.verificationStatus, availability: input.availability, hasBlockReason: Boolean(input.blockReason), hasAdminNotes: Boolean(input.adminNotes) });
  return updated;
}

export async function purgeCandidateByAdmin(candidateId: string, actorId: string, reason: string) {
  return withMongoTransaction(async (db, session) => {
    const candidate = await db.collection<Candidate>("candidates").findOne({ id: candidateId }, { session });
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    await Promise.all([
      db.collection("candidateDocuments").deleteMany({ candidateId }, { session }),
      db.collection("candidateEducations").deleteMany({ candidateId }, { session }),
      db.collection("candidateExperiences").deleteMany({ candidateId }, { session }),
      db.collection("savedJobs").deleteMany({ candidateId }, { session }),
      db.collection("notificationReads").deleteMany({ candidateId }, { session }),
      db.collection("candidates").deleteOne({ id: candidateId }, { session }),
    ]);
    await db.collection("auditLogs").insertOne({ actorId, action: "CANDIDATE_DELETED_BY_ADMIN", targetType: "CANDIDATE", targetId: candidateId, metadata: { reason, retainedRecruitmentTransactions: true }, createdAt: new Date().toISOString() }, { session });
    return { id: candidateId };
  });
}

export async function getDashboardAnalytics(scope: AdminScope, from?: string, to?: string) {
  const db = await getDatabase();
  const allScopedJobs = await db.collection<Job>("jobs").find(jobScopeFilter(scope)).toArray();
  const jobs = allScopedJobs.filter((job) => (!from || job.postedAt >= `${from}T00:00:00.000Z`) && (!to || job.postedAt <= `${to}T23:59:59.999Z`));
  const scopedJobIds = allScopedJobs.map((job) => job.id);
  const applicationFilter = { ...(scope.all ? {} : { jobId: { $in: scopedJobIds } }), ...dateFilter("appliedAt", from, to) };
  const serviceTypes = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined;
  const [applications, requirements, services] = await Promise.all([
    db.collection<Application>("applications").find(applicationFilter).toArray(),
    db.collection<EmployerRequirement>("employerRequirements").find({ ...requirementScopeFilter(scope), ...dateFilter("createdAt", from, to) }).toArray(),
    db.collection<ServiceRequest>("serviceRequests").find({ ...(serviceTypes ? { serviceType: { $in: serviceTypes } } : {}), ...dateFilter("createdAt", from, to) }).toArray(),
  ]);
  const verticals: BusinessVertical[] = ["RECRUITMENT", "SECURITY", "BABY_CARE", "HOUSEKEEPING", "PEST_CONTROL"];
  const comparison = verticals.filter((vertical) => scope.all || scope.verticals.includes(vertical)).map((vertical) => ({
    vertical,
    jobs: jobs.filter((job) => (job.businessVertical ?? inferBusinessVertical(job.category)) === vertical).length,
    applications: applications.filter((application) => allScopedJobs.find((job) => job.id === application.jobId && (job.businessVertical ?? inferBusinessVertical(job.category)) === vertical)).length,
    requirements: requirements.filter((item) => (item.businessVertical ?? inferBusinessVertical(item.category)) === vertical).length,
    services: services.filter((item) => businessVerticalForServiceType(item.serviceType) === vertical).length,
  }));
  const byDay = new Map<string, { date: string; applications: number; requirements: number; services: number }>();
  const add = (date: string, key: "applications" | "requirements" | "services") => { const day = date.slice(0, 10); const current = byDay.get(day) ?? { date: day, applications: 0, requirements: 0, services: 0 }; current[key]++; byDay.set(day, current); };
  applications.forEach((item) => add(item.appliedAt, "applications")); requirements.forEach((item) => add(item.createdAt, "requirements")); services.forEach((item) => add(item.createdAt, "services"));
  return { totals: { jobs: jobs.length, applications: applications.length, requirements: requirements.length, services: services.length }, comparison, timeline: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export async function listAuditLogs(filters: { q?: string; action?: string; from?: string; to?: string }) {
  const db = await getDatabase();
  const filter: Filter<AuditLog> = { ...dateFilter("createdAt", filters.from, filters.to) };
  if (filters.action) filter.action = filters.action;
  if (filters.q?.trim()) filter.$or = ["actorId", "action", "targetType", "targetId"].map((field) => ({ [field]: { $regex: filters.q!.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })) as Filter<AuditLog>[];
  const logs = await db.collection<AuditLog>("auditLogs").find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  const users = await db.collection("users").find({ id: { $in: [...new Set(logs.map((log) => log.actorId))] } }, { projection: { id: 1, name: 1, email: 1 } }).toArray();
  const actors = new Map(users.map((user) => [user.id as string, { name: user.name as string, email: user.email as string }]));
  return logs.map((log) => ({ ...log, actor: actors.get(log.actorId) }));
}

export async function reportData(type: "candidates" | "applications" | "jobs" | "service-requests", scope: AdminScope, from?: string, to?: string) {
  const db = await getDatabase();
  if (type === "jobs") return db.collection<Job>("jobs").find({ ...jobScopeFilter(scope), ...dateFilter("postedAt", from, to) }, { projection: { _id: 0 } }).sort({ postedAt: -1 }).toArray();
  const ids = await scopedJobIds(scope);
  if (type === "applications") return db.collection<Application>("applications").find({ ...(ids ? { jobId: { $in: ids } } : {}), ...dateFilter("appliedAt", from, to) }, { projection: { _id: 0 } }).sort({ appliedAt: -1 }).toArray();
  if (type === "service-requests") { const types = serviceTypesForScope(scope) as ServiceRequest["serviceType"][] | undefined; return db.collection<ServiceRequest>("serviceRequests").find({ ...(types ? { serviceType: { $in: types } } : {}), ...dateFilter("createdAt", from, to) }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }
  const candidateIds = ids ? await db.collection<Application>("applications").distinct("candidateId", { jobId: { $in: ids } }) : undefined;
  return db.collection<Candidate>("candidates").find({ ...(candidateIds ? { id: { $in: candidateIds } } : {}), deletedAt: { $exists: false }, ...dateFilter("createdAt", from, to) }, { projection: { _id: 0, passwordHash: 0, consents: 0 } }).sort({ createdAt: -1 }).toArray();
}
