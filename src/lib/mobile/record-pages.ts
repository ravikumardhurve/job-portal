import { getDatabase } from "@/lib/mongodb";
import { jobScopeFilter, requirementScopeFilter, serviceTypesForScope } from "@/lib/admin-scope";
import { updateEmployerRequirement, updateInterview, updateServiceRequest } from "@/lib/admin-operations";
import { portalStore, type Application, type EmployerRequirement, type Interview, type ServiceRequest } from "@/lib/portal";
import { EMPLOYER_REQUIREMENT_STATUSES, SERVICE_REQUEST_STATUSES } from "@/lib/statuses";
import type { authenticate } from "./auth";
import { MobileError, readBody, textField } from "./contracts";

const applicationStatuses = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "JOINING_SCHEDULED", "JOINED", "REJECTED", "WITHDRAWN"] as const satisfies readonly Application["status"][];
const interviewStatuses = ["SCHEDULED", "RESCHEDULED", "COMPLETED", "SELECTED", "REJECTED", "NO_SHOW", "CANCELLED"] as const satisfies readonly Interview["status"][];
const config = {
  applications: { collection: "applications", statuses: applicationStatuses, editable: ["status"], fields: ["id", "candidateId", "jobId", "status", "appliedAt", "updatedAt"] },
  interviews: { collection: "interviews", statuses: interviewStatuses, editable: ["status", "scheduledAt", "mode", "address", "meetingLink", "contactPerson", "contactMobile", "instructions", "internalNotes", "cancelReason"], fields: ["id", "candidateId", "applicationId", "jobId", "createdAt", "updatedAt"] },
  services: { collection: "serviceRequests", statuses: SERVICE_REQUEST_STATUSES, editable: ["status", "assignedStaff", "assignedVendor", "scheduledAt", "internalNotes"], fields: ["id", "customerName", "mobile", "serviceType", "city", "address", "staffRequired", "createdAt", "updatedAt"] },
  requirements: { collection: "employerRequirements", statuses: EMPLOYER_REQUIREMENT_STATUSES, editable: ["status", "assignedTo", "nextFollowUpAt", "internalNotes"], fields: ["id", "company", "contactName", "mobile", "contactEmail", "jobTitle", "category", "businessVertical", "candidatesRequired", "city", "createdAt", "updatedAt"] },
} as const;
type RecordSection = keyof typeof config;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Explicit scalar DTOs also protect against legacy documents with unexpected nested values.
function view(section: RecordSection, row: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of [...config[section].fields, ...config[section].editable]) {
    if (typeof row[key] === "string" || typeof row[key] === "number") data[key] = row[key];
  }
  if (section === "applications") data.statusHistory = Array.isArray(row.statusHistory) ? row.statusHistory.map(entry => ({
    status: typeof entry?.status === "string" ? entry.status : "",
    at: typeof entry?.at === "string" ? entry.at : "",
  })) : [];
  return data;
}

function timestamp(value: string, key: string, clearable: boolean) {
  if (!value && clearable) return "";
  // Require an explicit timezone; validate calendar components before Date normalizes them.
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(\.\d{1,3})?)?(Z|\+05:30)$/.exec(value);
  const day = match && new Date(`${match[1]}T00:00:00Z`);
  if (!match || !day || !Number.isFinite(day.valueOf()) || day.toISOString().slice(0, 10) !== match[1] || !Number.isFinite(Date.parse(value))) {
    throw new MobileError(`Invalid ${key}. Use a real date/time with Z or +05:30 (IST).`);
  }
  return new Date(value).toISOString();
}

/** Dispatch before generic admin GET lists. Authentication is supplied by the mobile handler. */
export async function recordPages(request: Request, path: string[], session: Extract<Awaited<ReturnType<typeof authenticate>>, { kind: "admin" }>): Promise<Response | null> {
  if (path[0] !== "admin" || path[1] !== "records") return null;
  try {
    if (session?.kind !== "admin" || !["ADMIN", "SUPER_ADMIN", "RECRUITER", "PARTNER_ADMIN"].includes(session.user.role)) throw new MobileError("Admin access required.", 403);
    if (path.length !== 4 || !Object.hasOwn(config, path[2]) || !/^[A-Za-z0-9_-]{1,100}$/.test(path[3])) throw new MobileError("Record not found.", 404);
    if (!["GET", "PATCH"].includes(request.method)) throw new MobileError("Method not supported.", 405);
    const section = path[2] as RecordSection;
    const id = path[3];
    const { scope } = session;
    const definition = config[section];
    const db = await getDatabase();
    const filter: Record<string, unknown> = { id };
    if (section === "applications" || section === "interviews") {
      if (!scope.all) {
        const jobs = await db.collection("jobs").find(jobScopeFilter(scope), { projection: { id: 1 } }).toArray();
        filter.jobId = { $in: jobs.map(job => job.id) };
      }
      if (section === "applications") filter.deletedAt = { $exists: false };
    } else if (section === "services") {
      const types = serviceTypesForScope(scope);
      if (types) filter.serviceType = { $in: types };
    } else Object.assign(filter, requirementScopeFilter(scope));
    const projection = Object.fromEntries([...definition.fields, ...definition.editable, ...(section === "applications" ? ["statusHistory.status", "statusHistory.at"] : [])].map(key => [key, 1]));
    const current = await db.collection(definition.collection).findOne(filter, { projection: { ...projection, _id: 0 } });
    if (!current) throw new MobileError("Record not found.", 404);
    if (request.method === "GET") return json({ data: view(section, current), statuses: definition.statuses });

    const body = await readBody(request);
    const allowed: readonly string[] = definition.editable;
    if (!Object.keys(body).some(key => allowed.includes(key)) || Object.keys(body).some(key => key !== "confirmed" && !allowed.includes(key))) throw new MobileError("Unsupported update fields.");
    if (body.confirmed !== undefined && typeof body.confirmed !== "boolean") throw new MobileError("Invalid confirmation.");
    const patch: Record<string, string> = {};
    for (const key of allowed) {
      if (!Object.hasOwn(body, key)) continue;
      const max = key === "internalNotes" || key === "instructions" ? 2000 : key === "address" || key === "cancelReason" ? 500 : key === "meetingLink" ? 2000 : key === "contactMobile" ? 30 : 120;
      patch[key] = textField(body, key, 0, max);
    }
    if (patch.status !== undefined && !(definition.statuses as readonly string[]).includes(patch.status)) throw new MobileError("Invalid status.");
    if (patch.status !== undefined && patch.status !== current.status && ["CANCELLED", "REJECTED", "WITHDRAWN", "CLOSED", "NO_SHOW"].includes(patch.status) && body.confirmed !== true) throw new MobileError("Confirm this status change before saving.");
    for (const key of ["scheduledAt", "nextFollowUpAt"]) if (patch[key] !== undefined) patch[key] = timestamp(patch[key], key, section !== "interviews");

    let updated: Record<string, unknown> | null;
    if (section === "applications") {
      // The portal has no application notes field/operation. Do not invent one here.
      updated = await portalStore.updateApplicationStatus(id, patch.status as Application["status"], scope) as unknown as Record<string, unknown>;
    } else if (section === "interviews") {
      if (patch.mode !== undefined && !["OFFLINE", "PHONE", "VIDEO"].includes(patch.mode)) throw new MobileError("Invalid interview mode.");
      if (patch.meetingLink) {
        let link: URL;
        try { link = new URL(patch.meetingLink); } catch { throw new MobileError("Invalid meeting link."); }
        if (link.protocol !== "https:" || link.username || link.password) throw new MobileError("Use an HTTPS meeting link without credentials.");
      }
      if (patch.contactMobile && !/^\+?[\d ()-]{7,30}$/.test(patch.contactMobile)) throw new MobileError("Invalid contact number.");
      const effective = { ...current, ...patch };
      if (effective.status === "CANCELLED" && (typeof effective.cancelReason !== "string" || !effective.cancelReason.trim())) throw new MobileError("Cancellation reason is required.");
      const changedTime = patch.scheduledAt !== undefined && Date.parse(patch.scheduledAt) !== Date.parse(String(current.scheduledAt));
      if (changedTime || patch.status === "RESCHEDULED" && current.status !== "RESCHEDULED") {
        if (!changedTime || Date.parse(patch.scheduledAt) <= Date.now()) throw new MobileError("Choose a new future interview date/time.");
        if (patch.status !== undefined && patch.status !== "RESCHEDULED") throw new MobileError("Save rescheduling separately from an outcome or cancellation.");
        patch.status = "RESCHEDULED";
      }
      // Notes-only edits must work even on legacy records with incomplete meeting details.
      if (["mode", "address", "meetingLink", "contactMobile"].some(key => patch[key] !== undefined) || changedTime) {
        const required = effective.mode === "OFFLINE" ? "address" : effective.mode === "PHONE" ? "contactMobile" : "meetingLink";
        if (typeof effective[required] !== "string" || !effective[required].trim()) throw new MobileError(`Please supply ${required} for this interview mode.`);
      }
      updated = await updateInterview(id, patch as Partial<Interview>, session.user.id, scope) as unknown as Record<string, unknown> | null;
    } else if (section === "services") {
      updated = await updateServiceRequest(id, patch as Partial<ServiceRequest>, session.user.id, scope) as unknown as Record<string, unknown> | null;
    } else {
      // This operation replaces every editable value: merge omissions explicitly, including status.
      const input = {
        status: (patch.status ?? current.status) as EmployerRequirement["status"],
        assignedTo: patch.assignedTo ?? current.assignedTo as string | undefined,
        internalNotes: patch.internalNotes ?? current.internalNotes as string | undefined,
        nextFollowUpAt: patch.nextFollowUpAt ?? current.nextFollowUpAt as string | undefined,
      };
      updated = await updateEmployerRequirement(id, input, session.user.id, scope) as unknown as Record<string, unknown> | null;
    }
    if (!updated) throw new MobileError("Record not found.", 404);
    return json({ data: view(section, updated), statuses: definition.statuses });
  } catch (error) {
    if (error instanceof MobileError) return json({ error: error.message }, error.status);
    if (error instanceof Error && ["APPLICATION_NOT_FOUND", "INTERVIEW_NOT_FOUND", "SERVICE_REQUEST_NOT_FOUND", "EMPLOYER_REQUIREMENT_NOT_FOUND"].includes(error.message)) return json({ error: "Record not found." }, 404);
    throw error; // The enclosing mobile handler sanitizes unexpected failures.
  }
}
