"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, Check, Clock3, MapPin, Search, SlidersHorizontal, UsersRound, WalletCards, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/portal";
import { CHHATTISGARH_DISTRICTS, SALARY_BANDS } from "@/lib/constants";
import { SaveJobButton } from "@/components/save-job-button";
import styles from "./job-explorer.module.css";

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

export function JobExplorer({ initialJobs, initialTotal, initialPageSize, initialFilters, initialCategories, initialSavedJobIds = [] }: {
  initialJobs: Job[]; initialTotal: number; initialPageSize: number; initialFilters: Partial<Filters>; initialCategories: string[]; initialSavedJobIds?: string[];
}) {
  const savedJobIds = new Set(initialSavedJobIds);
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(() => ({ ...defaultFilters, ...initialFilters }));
  const [showFilters, setShowFilters] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [hasLoaded, setHasLoaded] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = buildParams(filters);
      router.replace(params.size ? `/jobs?${params.toString()}` : "/jobs", { scroll: false });
      setHasLoaded(false);
      setHasError(false);
      fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("JOB_SEARCH_FAILED");
          return response.json() as Promise<{ data: Job[]; total: number }>;
        })
        .then((result) => {
          if (!controller.signal.aborted) { setJobs(result.data); setTotal(result.total); }
        })
        .catch(() => { if (!controller.signal.aborted) setHasError(true); })
        .finally(() => { if (!controller.signal.aborted) setHasLoaded(true); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, router]);

  function update(patch: Partial<Filters>) {
    setHasLoaded(false);
    setHasError(false);
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  function reset() {
    setHasLoaded(false);
    setHasError(false);
    setFilters({ ...defaultFilters });
  }

  const pageSize = initialPageSize || 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categoryOptions = [...new Set([...initialCategories, filters.category].filter(Boolean))].sort();
  const locationOptions = [...new Set([...cities, filters.city])];
  const salaryOptions = SALARY_BANDS.some((band) => band.value === filters.salaryBand)
    ? SALARY_BANDS
    : [...SALARY_BANDS, { value: filters.salaryBand, label: `Custom: ${filters.salaryBand.replace("-", " – ")}` }];
  const activeFilters: { label: string; patch: Partial<Filters> }[] = [];
  if (filters.q) activeFilters.push({ label: filters.q, patch: { q: "" } });
  if (filters.city !== "All locations") activeFilters.push({ label: filters.city, patch: { city: "All locations" } });
  if (filters.category) activeFilters.push({ label: filters.category, patch: { category: "" } });
  if (filters.employmentType) activeFilters.push({ label: employmentTypes.find((item) => item.value === filters.employmentType)?.label ?? filters.employmentType, patch: { employmentType: "" } });
  if (filters.shift) activeFilters.push({ label: `${shifts.find((item) => item.value === filters.shift)?.label} shift`, patch: { shift: "" } });
  if (filters.salaryBand) activeFilters.push({ label: salaryOptions.find((item) => item.value === filters.salaryBand)?.label ?? filters.salaryBand, patch: { salaryBand: "" } });
  if (filters.fresherOnly) activeFilters.push({ label: "Fresher friendly", patch: { fresherOnly: false } });

  return (
    <div className={styles.explorer}>
      <div className={styles.searchPanel} role="search" aria-label="Search jobs">
        <label className={styles.searchField}>
          <Search size={20} aria-hidden="true" />
          <span><span className={styles.fieldCaption}>WHAT ARE YOU LOOKING FOR?</span><input type="search" aria-label="Search role, company or category" value={filters.q} onChange={(event) => update({ q: event.target.value })} placeholder="Job title, company or skill" /></span>
        </label>
        <label className={styles.searchField}>
          <MapPin size={20} aria-hidden="true" />
          <span><span className={styles.fieldCaption}>LOCATION</span><select aria-label="Job location" value={filters.city} onChange={(event) => update({ city: event.target.value })}>{locationOptions.map((city) => <option key={city}>{city}</option>)}</select></span>
        </label>
        <button className={styles.filterToggle} type="button" aria-expanded={showFilters} aria-controls="job-filters" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={18} />Filters{activeFilters.length > 0 && <span>{activeFilters.length}</span>}</button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div id="job-filters" className={`${styles.filterPanel} ${showFilters ? styles.filtersOpen : ""}`}>
            <div className={styles.filterHeading}><h2><SlidersHorizontal size={17} />Refine your search</h2><button type="button" onClick={reset} disabled={!activeFilters.length && filters.sort === "latest" && filters.page === 1}>Reset</button></div>
            <div className={styles.filterFields}>
              <label>Category<select value={filters.category} onChange={(event) => update({ category: event.target.value })}><option value="">All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Employment type<select value={filters.employmentType} onChange={(event) => update({ employmentType: event.target.value })}>{employmentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label>Salary range<select value={filters.salaryBand} onChange={(event) => update({ salaryBand: event.target.value })}>{salaryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label>Work shift<select value={filters.shift} onChange={(event) => update({ shift: event.target.value })}>{shifts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className={styles.checkbox}><input type="checkbox" checked={filters.fresherOnly} onChange={(event) => update({ fresherOnly: event.target.checked })} /><span>Fresher friendly roles</span></label>
            </div>
            <button type="button" className={styles.doneButton} onClick={() => setShowFilters(false)}>Done <Check size={16} /></button>
          </div>
          <div className={styles.help}><UsersRound size={23} aria-hidden="true" /><h3>A little help goes a long way.</h3><p>Questions about a role or how to apply? Our local team is here to help.</p><Link href="/contact">Talk to our team <ArrowRight size={15} /></Link></div>
        </aside>

        <div className={styles.results}>
          <div className={styles.resultHeading}>
            <div><h2>Find your next role</h2><p role="status" aria-live="polite">{!hasLoaded ? "Finding opportunities…" : hasError ? "Search is temporarily unavailable" : `${total.toLocaleString("en-IN")} open ${total === 1 ? "opportunity" : "opportunities"}`}</p></div>
            <label className={styles.sort}>Sort by<select aria-label="Sort jobs" value={filters.sort} onChange={(event) => update({ sort: event.target.value })}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          {activeFilters.length > 0 && <div className={styles.activeFilters} aria-label="Active filters">{activeFilters.map(({ label, patch }, index) => <button key={index} type="button" onClick={() => update(patch)} aria-label={`Remove filter: ${label}`}><span>{label}</span><X size={13} /></button>)}<button type="button" className={styles.clearAll} onClick={reset}>Clear all</button></div>}
          <div className={styles.jobList} aria-busy={!hasLoaded}>
            {!hasLoaded ? <div className={styles.skeletons} aria-hidden="true">{[0, 1, 2].map((item) => <div className={styles.skeleton} key={item}><span /><span /><span /></div>)}</div>
              : hasError ? <div className={styles.empty} role="alert"><Search size={30} /><h3>We couldn&apos;t load these jobs.</h3><p>Please check your connection and try again. Your filters are still here.</p><button type="button" onClick={() => update({ page: filters.page })}>Try again <ArrowRight size={16} /></button></div>
              : jobs.length === 0 ? <div className={styles.empty}><Search size={30} /><h3>{filters.page > 1 ? "No jobs on this page." : "No matching roles just yet."}</h3><p>Try a different keyword or location, or clear your filters to explore all openings.</p><button type="button" onClick={reset}>Explore all jobs <ArrowRight size={16} /></button></div>
              : jobs.map((job) => (
                <article key={job.id} className={styles.job}>
                  <div className={styles.jobHeader}>
                    <span className={styles.jobIcon}><BriefcaseBusiness size={22} aria-hidden="true" /></span>
                    <div className={styles.jobTitle}><div><h3><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3>{job.urgent && <span className={styles.urgent}>Urgent hiring</span>}</div><p>{job.company}</p></div>
                    <div className={styles.save}><SaveJobButton jobId={job.id} initialSaved={savedJobIds.has(job.id)} /></div>
                  </div>
                  <div className={styles.jobMeta}><span><MapPin size={15} aria-hidden="true" />{job.city}</span><span className={styles.salary}><WalletCards size={15} aria-hidden="true" />₹{job.salaryMin.toLocaleString("en-IN")} – ₹{job.salaryMax.toLocaleString("en-IN")}</span><span><UsersRound size={15} aria-hidden="true" />{job.vacancies} {job.vacancies === 1 ? "vacancy" : "vacancies"}</span></div>
                  <div className={styles.jobBottom}>
                    <div className={styles.tags}><span>{employmentTypes.find((type) => type.value === job.employmentType)?.label ?? job.employmentType.replaceAll("_", " ")}</span>{job.category && <span>{job.category}</span>}{job.shift && <span><Clock3 size={12} aria-hidden="true" />{shifts.find((shift) => shift.value === job.shift)?.label ?? job.shift}</span>}</div>
                    <Link href={`/jobs/${job.id}`} className={styles.viewJob} aria-label={`View ${job.title} at ${job.company}`}>View job <ArrowRight size={16} /></Link>
                  </div>
                </article>
              ))}
          </div>
          {hasLoaded && !hasError && totalPages > 1 && <nav className={styles.pagination} aria-label="Job results pages"><button type="button" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })}><ChevronLeft size={16} />Previous</button><span>Page {filters.page} of {totalPages}</span><button type="button" disabled={filters.page >= totalPages} onClick={() => update({ page: filters.page + 1 })}>Next<ChevronRight size={16} /></button></nav>}
        </div>
      </div>
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
