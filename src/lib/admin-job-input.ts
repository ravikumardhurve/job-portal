import { canAccessVertical, inferBusinessVertical, isBusinessVertical, type AdminScope, type BusinessVertical } from "@/lib/admin-scope";
import type { Job } from "@/lib/portal";

export type AdminJobInput = Omit<Job, "id" | "status" | "postedAt" | "updatedAt"> & { businessVertical: BusinessVertical };
export type AdminJobBody = Partial<Omit<Job, "id" | "status" | "postedAt" | "updatedAt">> & { publishNow?: boolean };

const employmentTypes: Job["employmentType"][] = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"];
const shifts: NonNullable<Job["shift"]>[] = ["DAY", "NIGHT", "ROTATIONAL"];

export function parseAdminJobInput(body: AdminJobBody, scope: AdminScope): { data: AdminJobInput } | { error: string; status: number } {
  if (!body.title?.trim() || !body.company?.trim() || !body.category?.trim() || !body.city?.trim() || !body.district?.trim() || !Number.isFinite(body.salaryMin) || !Number.isFinite(body.salaryMax) || !Number.isInteger(body.vacancies) || !body.employmentType) {
    return { error: "Complete all required job information.", status: 400 };
  }

  const salaryMin = body.salaryMin as number;
  const salaryMax = body.salaryMax as number;
  const vacancies = body.vacancies as number;
  if (!employmentTypes.includes(body.employmentType) || salaryMin < 0 || salaryMax < salaryMin || vacancies < 1) {
    return { error: "Salary, vacancies, or employment type is invalid.", status: 400 };
  }
  if (body.shift && !shifts.includes(body.shift)) return { error: "Shift is invalid.", status: 400 };
  if (body.minExperience !== undefined && (!Number.isFinite(body.minExperience) || body.minExperience < 0)) return { error: "Minimum experience is invalid.", status: 400 };
  if (body.maxExperience !== undefined && (!Number.isFinite(body.maxExperience) || body.maxExperience < (body.minExperience ?? 0))) return { error: "Maximum experience is invalid.", status: 400 };

  const requestedVertical = isBusinessVertical(body.businessVertical) ? body.businessVertical : inferBusinessVertical(body.category);
  const businessVertical = scope.all ? requestedVertical : scope.verticals[0];
  if (!businessVertical || !canAccessVertical(scope, businessVertical)) return { error: "You cannot manage a job for this business field.", status: 403 };

  return {
    data: {
      title: body.title.trim(),
      company: body.company.trim(),
      category: body.category.trim(),
      businessVertical,
      city: body.city.trim(),
      district: body.district.trim(),
      salaryMin,
      salaryMax,
      employmentType: body.employmentType,
      vacancies,
      urgent: Boolean(body.urgent),
      description: body.description?.trim(),
      jobRole: body.jobRole?.trim(),
      qualification: body.qualification?.trim(),
      minExperience: body.minExperience,
      maxExperience: body.maxExperience,
      shift: body.shift,
      applicationDeadline: body.applicationDeadline,
      benefits: body.benefits ?? [],
    },
  };
}
