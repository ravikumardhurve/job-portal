import type { LeadStatus, ServiceRequest } from "@/lib/portal";

export const EMPLOYER_REQUIREMENT_STATUSES = ["NEW", "CONTACTED", "VERIFIED", "APPROVED", "RECRUITING", "FILLED", "CLOSED", "REJECTED", "ON_HOLD"] as const satisfies readonly LeadStatus[];

export const SERVICE_REQUEST_STATUSES = ["NEW", "CONTACTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const satisfies readonly ServiceRequest["status"][];
