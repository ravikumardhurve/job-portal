import { GET as searchJobs } from "@/app/api/jobs/route";
import { getDatabase } from "@/lib/mongodb";
import { requirementScopeFilter } from "@/lib/admin-scope";
import { parseAdminJobInput } from "@/lib/admin-job-input";
import { recordAudit, updateInterview, updateServiceRequest, updateEmployerRequirement } from "@/lib/admin-operations";
import { portalStore, type ApplicationStatus, type Interview, type JobStatus, type LeadStatus, type ServiceRequest, type EmployerRequirement } from "@/lib/portal";
import { authenticate, login, logout, register } from "./auth";
import { adminList, adminOverview } from "./admin";
import { candidateView, interviewView, jobView, MobileError, numberField, readBody, serviceTypes, textField } from "./contracts";
import { publicPages } from "./public";
import { candidatePages } from "./candidate-pages";
import { adminPages } from "./admin-pages";
import { adminAssets } from "./admin-assets";
import { recordPages } from "./record-pages";

export async function mobileHandler(request: Request, path: string[]) {
  try {
    const result = await dispatch(request, path);
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("X-Content-Type-Options", "nosniff");
    return result;
  } catch (error) {
    const known: Record<string, [number, string]> = {
      DUPLICATE_MOBILE: [409, "This mobile number is already registered."], DUPLICATE_EMAIL: [409, "This email is already registered."],
      DUPLICATE_APPLICATION: [409, "You have already applied for this job."], PROFILE_INCOMPLETE: [422, "Complete your address and job preference in Profile before applying (55% required)."],
      JOB_NOT_AVAILABLE: [404, "This job is no longer accepting applications."], CANDIDATE_NOT_ELIGIBLE: [403, "Your account is not eligible to apply."],
      JOB_NOT_FOUND: [404, "Job not found."], APPLICATION_NOT_FOUND: [404, "Application not found."], INTERVIEW_NOT_FOUND: [404, "Interview not found."], SERVICE_REQUEST_NOT_FOUND: [404, "Request not found."], EMPLOYER_REQUIREMENT_NOT_FOUND: [404, "Requirement not found."],
    };
    const mapped = error instanceof Error ? known[error.message] : undefined;
    const status = error instanceof MobileError ? error.status : mapped?.[0] ?? 500;
    return Response.json({ error: error instanceof MobileError ? error.message : mapped?.[1] ?? "Could not complete the request. Please try again." }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) } });
  }
}

async function dispatch(request: Request, path: string[]) {
  const route = path.join("/");
  const method = request.method;
  const url = new URL(request.url);
  const publicResponse = await publicPages(request, path);
  if (publicResponse) return publicResponse;
  if (method === "POST" && route === "auth/login") return Response.json({ data: await login(await readBody(request)) });
  if (method === "POST" && route === "auth/register") return Response.json({ data: await register(await readBody(request)) }, { status: 201 });
  if (method === "GET" && route === "jobs") return searchJobs(request);
  if (method === "GET" && path[0] === "jobs" && path.length === 2) {
    const job = await portalStore.getPublishedJob(path[1]);
    if (!job) throw new MobileError("Job no longer available.", 404);
    return Response.json({ data: jobView(job) });
  }
  const session = await authenticate(request);
  if (method === "GET" && route === "auth/me") return Response.json({ data: { kind: session.kind, user: session.user } });
  if (method === "POST" && route === "auth/logout") { await logout(session.tokenHash); return Response.json({ message: "Signed out." }); }
  if (path[0] === "candidate") {
    if (session.kind !== "candidate") throw new MobileError("Candidate access required.", 403);
    const extended = await candidatePages(request, path, session);
    if (extended) return extended;
    const id = session.user.id;
    if (method === "GET" && route === "candidate/profile") return Response.json({ data: session.user });
    if (method === "PATCH" && route === "candidate/profile") {
      const body = await readBody(request);
      const city = textField(body, "city", 2, 100);
      const state = textField(body, "state", 2, 100);
      const role = textField(body, "role", 2, 100);
      const line1 = textField(body, "address", 3, 300);
      await portalStore.updateCandidateAddress(id, { currentAddress: { city, state, line1 } });
      const updated = await portalStore.updateCandidateJobPreference(id, { ...session.user.jobPreference, role, location: city });
      return Response.json({ data: candidateView(updated) });
    }
    if (method === "GET" && route === "candidate/applications") {
      const rows = await portalStore.listCandidateApplications(id);
      return Response.json({ data: rows.map(a => ({ id: a.id, jobId: a.jobId, status: a.status, appliedAt: a.appliedAt, statusHistory: a.statusHistory, job: a.job ? jobView(a.job) : undefined })) });
    }
    if (method === "POST" && route === "candidate/applications") {
      const body = await readBody(request);
      const application = await portalStore.createApplication(id, textField(body, "jobId"));
      return Response.json({ data: { id: application.id, status: application.status } }, { status: 201 });
    }
    if (method === "GET" && route === "candidate/interviews") return Response.json({ data: (await portalStore.listCandidateInterviews(id)).map(interviewView) });
    if (method === "GET" && route === "candidate/saved") return Response.json({ data: (await portalStore.listSavedJobs(id)).map(s => ({ jobId: s.jobId, job: s.job ? jobView(s.job) : undefined })) });
    if ((method === "POST" || method === "DELETE") && route === "candidate/saved") {
      const body = await readBody(request);
      const jobId = textField(body, "jobId");
      if (method === "POST") await portalStore.saveJob(id, jobId); else await portalStore.unsaveJob(id, jobId);
      return Response.json({ message: method === "POST" ? "Job saved." : "Job removed." });
    }
    if (method === "POST" && route === "candidate/services") {
      const body = await readBody(request);
      const serviceType = textField(body, "serviceType") as ServiceRequest["serviceType"];
      if (!serviceTypes.includes(serviceType)) throw new MobileError("Invalid service.");
      const city = textField(body, "city", 2, 100);
      const address = textField(body, "address", 3, 300);
      const staffRequired = numberField(body, "staffRequired", 1);
      if (!Number.isInteger(staffRequired) || staffRequired > 10000) throw new MobileError("Invalid staff count.");
      const data = await portalStore.createServiceRequest({ customerName: session.user.fullName, mobile: session.user.mobile, city, address, serviceType, staffRequired });
      return Response.json({ data: { id: data.id }, message: "Request received. Our team will contact you." }, { status: 201 });
    }
  }
  if (path[0] === "admin") {
    if (session.kind !== "admin") throw new MobileError("Admin access required.", 403);
    const assets = await adminAssets(request, path, session);
    if (assets) return assets;
    const record = await recordPages(request, path, session);
    if (record) return record;
    const extended = await adminPages(request, path, session);
    if (extended) return extended;
    const { scope, user } = session;
    if (method === "GET" && route === "admin/overview") return Response.json(await adminOverview(scope));
    if (method === "GET" && path.length === 2) return Response.json(await adminList(path[1], scope, url));
    if (method === "POST" && route === "admin/jobs") {
      const body = await readBody(request);
      const parsed = parseAdminJobInput({ title: textField(body, "title"), company: textField(body, "company"), city: textField(body, "city"), district: textField(body, "district"), category: textField(body, "category"), salaryMin: numberField(body, "salaryMin"), salaryMax: numberField(body, "salaryMax"), vacancies: numberField(body, "vacancies", 1), employmentType: "FULL_TIME", description: textField(body, "description", 10, 5000) }, scope);
      if ("error" in parsed) throw new MobileError(parsed.error, parsed.status);
      const job = await portalStore.createAdminJob(parsed.data, "DRAFT");
      await recordAudit(user.id, "JOB_CREATED", "JOB", job.id, { source: "MOBILE", status: "DRAFT" });
      return Response.json({ data: jobView(job) }, { status: 201 });
    }
    if (method === "PATCH" && path.length === 3) {
      const body = await readBody(request);
      const status = textField(body, "status");
      const id = path[2];
      if (path[1] === "jobs" && ["PUBLISHED", "PAUSED", "CLOSED"].includes(status)) {
        await portalStore.updateJobStatus(id, status as JobStatus, scope);
        await recordAudit(user.id, "JOB_STATUS_UPDATED", "JOB", id, { status, source: "MOBILE" });
      } else if (path[1] === "applications" && ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"].includes(status)) {
        await portalStore.updateApplicationStatus(id, status as ApplicationStatus, scope);
        await recordAudit(user.id, "APPLICATION_STATUS_UPDATED", "APPLICATION", id, { status, source: "MOBILE" });
      } else if (path[1] === "services" && ["CONTACTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
        await updateServiceRequest(id, { status: status as ServiceRequest["status"] }, user.id, scope);
      } else if (path[1] === "interviews" && ["COMPLETED", "SELECTED", "REJECTED", "NO_SHOW"].includes(status)) {
        await updateInterview(id, { status: status as Interview["status"] }, user.id, scope);
      } else if (path[1] === "requirements" && ["CONTACTED", "VERIFIED", "RECRUITING", "FILLED", "CLOSED"].includes(status)) {
        const item = await (await getDatabase()).collection<EmployerRequirement>("employerRequirements").findOne({ id, ...requirementScopeFilter(scope) });
        if (!item) throw new MobileError("Requirement not found.", 404);
        await updateEmployerRequirement(id, { status: status as LeadStatus, assignedTo: item.assignedTo, internalNotes: item.internalNotes, nextFollowUpAt: item.nextFollowUpAt }, user.id, scope);
      } else throw new MobileError("Unsupported status action.");
      return Response.json({ message: "Status updated." });
    }
  }
  throw new MobileError("Endpoint not found.", 404);
}
