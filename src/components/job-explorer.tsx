"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MapPin, Search, SlidersHorizontal, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/portal";
import { CHHATTISGARH_DISTRICTS, SALARY_BANDS } from "@/lib/constants";
import { SaveJobButton } from "@/components/save-job-button";

const cities = ["All locations", ...CHHATTISGARH_DISTRICTS];
const employmentTypes = [
  { value: "", label: "Any type" },
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
];
const shifts = [
  { value: "", label: "Any shift" },
  { value: "DAY", label: "Day" },
  { value: "NIGHT", label: "Night" },
  { value: "ROTATIONAL", label: "Rotational" },
];
const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "salary_high", label: "Salary: high to low" },
  { value: "salary_low", label: "Salary: low to high" },
];

type Filters = { q: string; city: string; category: string; employmentType: string; shift: string; salaryBand: string; fresherOnly: boolean; sort: string; page: number };

const defaultFilters: Filters = { q: "", city: "All locations", category: "", employmentType: "", shift: "", salaryBand: "", fresherOnly: false, sort: "latest", page: 1 };

export function JobExplorer({ initialJobs, initialTotal, initialPageSize, initialFilters, initialSavedJobIds = [] }: { initialJobs: Job[]; initialTotal: number; initialPageSize: number; initialFilters: Partial<Filters>; initialSavedJobIds?: string[] }) {
  const savedJobIds = new Set(initialSavedJobIds);
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(() => ({ ...defaultFilters, ...initialFilters }));
  const [showFilters, setShowFilters] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(true);
  const isFirstRun = useRef(true);

  useEffect(() => {
    fetch("/api/jobs/categories").then((response) => response.json()).then((result: { data: string[] }) => setCategories(result.data));
  }, []);

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = buildParams(filters);
      router.replace(`/jobs?${params.toString()}`, { scroll: false });
      setHasLoaded(false);
      fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("JOB_SEARCH_FAILED");
          return response.json() as Promise<{ data: Job[]; total: number }>;
        })
        .then((result) => { setJobs(result.data); setTotal(result.total); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setJobs([]); })
        .finally(() => { if (!controller.signal.aborted) setHasLoaded(true); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, router]);

  function update(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  const pageSize = initialPageSize || 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="rounded-lg border border-[#DCE8E1] bg-white p-3 shadow-[0_10px_30px_rgba(130,76,40,.06)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_230px_auto]">
          <label className="flex h-12 items-center gap-2 border border-[#D5E3DB] px-3">
            <Search size={19} className="text-[#157A4A]" />
            <input aria-label="Search role, company or category" value={filters.q} onChange={(event) => update({ q: event.target.value })} placeholder="Search role, company or category" className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#6B7A72]" />
          </label>
          <label className="flex h-12 items-center gap-2 border border-[#D5E3DB] px-3">
            <MapPin size={18} className="text-[#157A4A]" />
            <select aria-label="Job location" value={filters.city} onChange={(event) => update({ city: event.target.value })} className="w-full bg-white text-sm outline-none">
              {cities.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setShowFilters((value) => !value)} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#1E2B26] px-5 text-sm font-bold text-white">
            <SlidersHorizontal size={17} /> Filters
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-[#DCE8E1] pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <select aria-label="Job category" value={filters.category} onChange={(event) => update({ category: event.target.value })} className="h-11 rounded-md border border-[#D5E3DB] px-3 text-sm">
              <option value="">Any category</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select aria-label="Employment type" value={filters.employmentType} onChange={(event) => update({ employmentType: event.target.value })} className="h-11 rounded-md border border-[#D5E3DB] px-3 text-sm">
              {employmentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Work shift" value={filters.shift} onChange={(event) => update({ shift: event.target.value })} className="h-11 rounded-md border border-[#D5E3DB] px-3 text-sm">
              {shifts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Salary range" value={filters.salaryBand} onChange={(event) => update({ salaryBand: event.target.value })} className="h-11 rounded-md border border-[#D5E3DB] px-3 text-sm">
              {SALARY_BANDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Sort jobs" value={filters.sort} onChange={(event) => update({ sort: event.target.value })} className="h-11 rounded-md border border-[#D5E3DB] px-3 text-sm">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#4B5A52] sm:col-span-2 lg:col-span-5">
              <input type="checkbox" checked={filters.fresherOnly} onChange={(event) => update({ fresherOnly: event.target.checked })} className="h-4 w-4" />
              Fresher friendly roles only
            </label>
          </div>
        )}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#4B5A52]">{hasLoaded ? `${total} open opportunities` : "Searching opportunities..."}</p>
        <p className="hidden text-xs font-medium text-[#6B7A72] sm:block">Verified local employers</p>
      </div>
      <div className="mt-4 grid gap-4">
        {hasLoaded && jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D5E3DB] bg-white p-10 text-center">
            <h2 className="font-extrabold">No matching jobs found.</h2>
            <p className="mt-2 text-sm text-[#4B5A52]">Try another role, location or filter.</p>
          </div>
        ) : jobs.map((job) => (
          <article key={job.id} className="group grid gap-5 rounded-lg border border-[#DCE8E1] bg-white p-5 shadow-[0_5px_15px_rgba(130,76,40,.04)] transition hover:border-[#B9D6C6] hover:shadow-lg md:grid-cols-[auto_1fr_auto] md:items-center">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#E9F3ED] text-[#157A4A]"><BriefcaseBusiness size={22} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#1E2B26]">{job.title}</h2>
                {job.urgent ? <span className="rounded-full bg-[#FBE4D6] px-2 py-0.5 text-[11px] font-bold text-[#C2410C]">Urgent hiring</span> : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F7A4D]"><BadgeCheck size={13} /> Verified</span>}
              </div>
              <p className="mt-1 text-sm text-[#4B5A52]">{job.company}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#5C6B63]">
                <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-[#157A4A]" />{job.city}</span>
                <span className="inline-flex items-center gap-1"><WalletCards size={14} className="text-[#157A4A]" />Rs. {job.salaryMin.toLocaleString("en-IN")} - {job.salaryMax.toLocaleString("en-IN")}</span>
                <span>{job.employmentType.replaceAll("_", " ")}</span>
                <span>{job.vacancies} vacancies</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SaveJobButton jobId={job.id} initialSaved={savedJobIds.has(job.id)} />
              <Link href={`/jobs/${job.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#B9D6C6] px-4 py-2.5 text-sm font-bold text-[#0F5C38] transition group-hover:bg-[#157A4A] group-hover:text-white">View job <ArrowRight size={16} /></Link>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })} className="rounded-md border border-[#D5E3DB] px-4 py-2 text-sm font-bold text-[#4B5A52] disabled:opacity-40">Previous</button>
          <span className="text-sm font-semibold text-[#4B5A52]">Page {filters.page} of {totalPages}</span>
          <button type="button" disabled={filters.page >= totalPages} onClick={() => update({ page: filters.page + 1 })} className="rounded-md border border-[#D5E3DB] px-4 py-2 text-sm font-bold text-[#4B5A52] disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function buildParams(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city !== "All locations") params.set("city", filters.city);
  if (filters.category) params.set("category", filters.category);
  if (filters.employmentType) params.set("employmentType", filters.employmentType);
  if (filters.shift) params.set("shift", filters.shift);
  if (filters.fresherOnly) params.set("fresherOnly", "true");
  if (filters.sort !== "latest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.salaryBand) {
    const [min, max] = filters.salaryBand.split("-");
    if (min) params.set("salaryMin", min);
    if (max) params.set("salaryMax", max);
  }
  return params;
}
