import { getDatabase } from "@/lib/mongodb";
import { jobScopeFilter, requirementScopeFilter, serviceTypesForScope, type AdminScope } from "@/lib/admin-scope";
import { type Job, type Candidate, type Application, type Interview, type ServiceRequest, type EmployerRequirement, portalStore } from "@/lib/portal";
import { MobileError, jobView, paging } from "./contracts";

export async function adminList(section: string, scope: AdminScope, url: URL) {
  const db = await getDatabase();
  const { page, pageSize } = paging(url);
  const scopedJobs = scope.all ? undefined : await db.collection<Job>("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray();
  const jobIds = scopedJobs?.map(j => j.id);
  const applicationScope = jobIds ? { jobId: { $in: jobIds } } : {};
  const serviceTypes = serviceTypesForScope(scope);
  const candidates = jobIds ? await db.collection<Application>("applications").distinct("candidateId", applicationScope) : undefined;
  const config: Record<string, { collection: string; filter: Record<string, unknown>; search: string[]; date: string }> = {
    jobs: { collection: "jobs", filter: jobScopeFilter(scope), search: ["title", "company", "city", "id"], date: "postedAt" },
    applications: { collection: "applications", filter: { ...applicationScope, deletedAt: { $exists: false } }, search: ["id", "candidateId", "jobId"], date: "appliedAt" },
    candidates: { collection: "candidates", filter: { ...(candidates ? { id: { $in: candidates } } : {}), deletedAt: { $exists: false } }, search: ["fullName", "mobile", "city", "id"], date: "createdAt" },
    interviews: { collection: "interviews", filter: applicationScope, search: ["id", "candidateId", "jobId"], date: "scheduledAt" },
    services: { collection: "serviceRequests", filter: serviceTypes ? { serviceType: { $in: serviceTypes } } : {}, search: ["customerName", "mobile", "city", "id"], date: "createdAt" },
    requirements: { collection: "employerRequirements", filter: requirementScopeFilter(scope), search: ["company", "jobTitle", "city", "id"], date: "createdAt" },
  };
  const configItem = config[section];
  if (!configItem) throw new MobileError("Page not found.", 404);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const status = url.searchParams.get("status");
  const filter = { $and: [configItem.filter, ...(query ? [{ $or: configItem.search.map(key => ({ [key]: { $regex: query, $options: "i" } })) }] : []), ...(status ? [{ [section === "candidates" ? "verificationStatus" : "status"]: status }] : [])] };
  const collection = db.collection(configItem.collection);
  const [rows, total] = await Promise.all([collection.find(filter, { projection: { passwordHash: 0 } }).sort({ [configItem.date]: -1, id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(), collection.countDocuments(filter)]);
  const candidateIds = rows.map(row => row.candidateId).filter(Boolean);
  const rowJobIds = rows.map(row => row.jobId).filter(Boolean);
  const [people, jobs] = await Promise.all([db.collection<Candidate>("candidates").find({ id: { $in: candidateIds } }, { projection: { id: 1, fullName: 1 } }).toArray(), db.collection<Job>("jobs").find({ id: { $in: rowJobIds } }, { projection: { id: 1, title: 1 } }).toArray()]);
  const names = new Map(people.map(person => [person.id, person.fullName]));
  const titles = new Map(jobs.map(job => [job.id, job.title]));
  const data = rows.map(row => {
    const base = { id: row.id as string, status: (row.status ?? row.verificationStatus) as string };
    if (section === "jobs") { const j = row as unknown as Job; return { ...base, title: j.title, subtitle: `${j.company} · ${j.city}`, detail: `${j.vacancies} vacancies`, job: jobView(j) }; }
    if (section === "candidates") { const c = row as unknown as Candidate; return { ...base, title: c.fullName, subtitle: c.mobile, detail: `${c.city ?? "—"} · ${c.profileCompletion ?? 0}% profile` }; }
    if (section === "services") { const s = row as unknown as ServiceRequest; return { ...base, title: s.customerName, subtitle: `${s.serviceType.replaceAll("_", " ")} · ${s.city}`, detail: s.mobile }; }
    if (section === "requirements") { const r = row as unknown as EmployerRequirement; return { ...base, title: r.company, subtitle: r.jobTitle, detail: `${r.city} · ${r.candidatesRequired} staff` }; }
    const r = row as unknown as Application | Interview;
    return { ...base, title: names.get(r.candidateId) ?? r.candidateId, subtitle: titles.get(r.jobId) ?? r.jobId, detail: section === "interviews" ? (r as Interview).scheduledAt : (r as Application).appliedAt };
  });
  return { data, total, page, pageSize };
}

export async function adminOverview(scope: AdminScope) {
  const dashboard = await portalStore.getAdminDashboard(scope);
  return { data: dashboard.metrics };
}
