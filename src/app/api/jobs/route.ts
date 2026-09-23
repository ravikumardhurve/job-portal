import { portalStore } from "@/lib/portal";
import type { JobSearchFilters } from "@/lib/portal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const employmentType = searchParams.get("employmentType");
  const shift = searchParams.get("shift");
  const sort = searchParams.get("sort");
  const salaryMin = optionalNumber(searchParams.get("salaryMin"));
  const salaryMax = optionalNumber(searchParams.get("salaryMax"));
  const page = optionalNumber(searchParams.get("page"));
  if (employmentType && !["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"].includes(employmentType)) return Response.json({ error: "Invalid employment type." }, { status: 400 });
  if (shift && !["DAY", "NIGHT", "ROTATIONAL"].includes(shift)) return Response.json({ error: "Invalid shift." }, { status: 400 });
  if (sort && !["latest", "salary_high", "salary_low"].includes(sort)) return Response.json({ error: "Invalid sort option." }, { status: 400 });
  if (salaryMin === null || salaryMax === null || page === null || salaryMin !== undefined && salaryMin < 0 || salaryMax !== undefined && salaryMax < 0 || page !== undefined && (!Number.isInteger(page) || page < 1)) return Response.json({ error: "Invalid numeric filter." }, { status: 400 });
  const filters: JobSearchFilters = {
    q: searchParams.get("q") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    employmentType: (employmentType as JobSearchFilters["employmentType"]) ?? undefined,
    shift: (shift as JobSearchFilters["shift"]) ?? undefined,
    qualification: searchParams.get("qualification") ?? undefined,
    fresherOnly: searchParams.get("fresherOnly") === "true",
    salaryMin,
    salaryMax,
    sort: (sort as JobSearchFilters["sort"]) ?? undefined,
    page,
  };
  const result = await portalStore.listPublishedJobs(filters);
  return Response.json({ data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
}

function optionalNumber(value: string | null): number | undefined | null {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
