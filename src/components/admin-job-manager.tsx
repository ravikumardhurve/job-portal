"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, SlidersHorizontal, BriefcaseBusiness, CheckCircle2, Copy, ExternalLink, FileClock, IndianRupee, MapPin, PauseCircle, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, inferBusinessVertical, type BusinessVertical } from "@/lib/admin-scope";
import type { Job, JobStatus } from "@/lib/portal";
import styles from "./admin-job-manager.module.css";

type FormState = {
  title: string;
  company: string;
  businessVertical: BusinessVertical;
  category: string;
  jobRole: string;
  city: string;
  district: string;
  salaryMin: string;
  salaryMax: string;
  vacancies: string;
  employmentType: Job["employmentType"];
  shift: NonNullable<Job["shift"]>;
  qualification: string;
  minExperience: string;
  maxExperience: string;
  description: string;
  benefits: string;
  applicationDeadline: string;
  urgent: boolean;
};

const jobStatuses: JobStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"];
const categorySuggestions: Record<BusinessVertical, string[]> = {
  RECRUITMENT: ["Office Staff", "Sales", "Delivery", "Driver", "Retail", "Manpower"],
  SECURITY: ["Security Guard", "Security Supervisor", "Bouncer"],
  BABY_CARE: ["Baby Care", "Caretaker", "Patient Care", "Elder Care"],
  HOUSEKEEPING: ["Housekeeping", "Cleaning Staff", "Maid"],
  PEST_CONTROL: ["Pest Control", "Termite Technician", "Fumigation Staff"],
};

const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function emptyForm(vertical: BusinessVertical): FormState {
  return {
    title: "",
    company: "",
    businessVertical: vertical,
    category: "",
    jobRole: "",
    city: "Raipur",
    district: "Raipur",
    salaryMin: "",
    salaryMax: "",
    vacancies: "1",
    employmentType: "FULL_TIME",
    shift: "DAY",
    qualification: "",
    minExperience: "",
    maxExperience: "",
    description: "",
    benefits: "",
    applicationDeadline: "",
    urgent: false,
  };
}

function formFromJob(job: Job): FormState {
  return {
    title: job.title,
    company: job.company,
    businessVertical: job.businessVertical ?? inferBusinessVertical(job.category),
    category: job.category,
    jobRole: job.jobRole ?? "",
    city: job.city,
    district: job.district,
    salaryMin: String(job.salaryMin),
    salaryMax: String(job.salaryMax),
    vacancies: String(job.vacancies),
    employmentType: job.employmentType,
    shift: job.shift ?? "DAY",
    qualification: job.qualification ?? "",
    minExperience: job.minExperience === undefined ? "" : String(job.minExperience),
    maxExperience: job.maxExperience === undefined ? "" : String(job.maxExperience),
    description: job.description ?? "",
    benefits: job.benefits?.join("\n") ?? "",
    applicationDeadline: job.applicationDeadline?.slice(0, 10) ?? "",
    urgent: job.urgent,
  };
}

export function AdminJobManager({ allowedVerticals, canChooseVertical, initialCreate = false }: { allowedVerticals: BusinessVertical[]; canChooseVertical: boolean; initialCreate?: boolean }) {
  const defaultVertical = allowedVerticals[0] ?? "RECRUITMENT";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | JobStatus>("ALL");
  const [vertical, setVertical] = useState<"ALL" | BusinessVertical>(canChooseVertical ? "ALL" : defaultVertical);
  const [modalOpen, setModalOpen] = useState(initialCreate);
  const [editingJobId, setEditingJobId] = useState<string>();
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultVertical));
  const [saving, setSaving] = useState<"draft" | "save" | "publish">();
  const [updatingJobId, setUpdatingJobId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLElement>(null);
  const mutationLock = useRef(false);
  const fetchController = useRef<AbortController | null>(null);

  const loadJobs = useCallback(async () => {
    fetchController.current?.abort();
    const controller = new AbortController();
    fetchController.current = controller;
    setLoading(true);
    setLoadError(undefined);
    try {
      const response = await fetch("/api/admin/jobs", { signal: controller.signal });
      const result = await response.json() as { data?: Job[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Jobs load nahi ho sake.");
      if (!controller.signal.aborted) setJobs(result.data);
    } catch (loadError) {
      if (!controller.signal.aborted) setLoadError(loadError instanceof Error ? loadError.message : "Could not load jobs. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadJobs(); }, 0);
    return () => { window.clearTimeout(timer); fetchController.current?.abort(); };
  }, [loadJobs]);
  useEffect(() => {
    if (!modalOpen) return;
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [modalOpen]);

  const filteredJobs = useMemo(() => filterJobs(jobs, query, status, vertical), [jobs, query, status, vertical]);

  const counts = useMemo(() => ({
    total: jobs.length,
    published: jobs.filter((job) => job.status === "PUBLISHED").length,
    draft: jobs.filter((job) => job.status === "DRAFT" || job.status === "PENDING").length,
    paused: jobs.filter((job) => job.status === "PAUSED").length,
  }), [jobs]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }));

  function openCreateModal() {
    if (mutationLock.current) return;
    setEditingJobId(undefined);
    setForm(emptyForm(defaultVertical));
    setError(undefined);
    setModalOpen(true);
  }

  function openEditModal(job: Job) {
    if (mutationLock.current) return;
    setEditingJobId(job.id);
    setForm(formFromJob(job));
    setError(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingJobId(undefined);
    setError(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutationLock.current || loading) return;
    mutationLock.current = true;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publishNow = submitter?.value === "publish";
    const isEditing = Boolean(editingJobId);
    setSaving(publishNow ? "publish" : isEditing ? "save" : "draft");
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(isEditing ? `/api/admin/jobs/${encodeURIComponent(editingJobId!)}` : "/api/admin/jobs", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          publishNow,
          salaryMin: Number(form.salaryMin),
          salaryMax: Number(form.salaryMax),
          vacancies: Number(form.vacancies),
          minExperience: form.minExperience ? Number(form.minExperience) : undefined,
          maxExperience: form.maxExperience ? Number(form.maxExperience) : undefined,
          benefits: form.benefits.split(/[\n,]/).map((benefit) => benefit.trim()).filter(Boolean),
        }),
      });
      const result = await response.json() as { data?: Job; error?: string; message?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Job save nahi ho saka.");
      setJobs((current) => isEditing ? current.map((job) => job.id === editingJobId ? result.data! : job) : [result.data!, ...current]);
      if (!isEditing) resetFilters();
      closeModal();
      setMessage(result.message ?? (isEditing ? "Job details updated." : publishNow ? "Job published." : "Job draft saved."));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Job save nahi ho saka.");
    } finally {
      setSaving(undefined);
      mutationLock.current = false;
    }
  }

  async function updateStatus(job: Job, nextStatus: JobStatus) {
    if (mutationLock.current || job.status === nextStatus) return;
    if (nextStatus === "ARCHIVED" && !window.confirm(`${job.title} ko archive karein? Ye public listing se remove ho jayegi.`)) return;
    mutationLock.current = true;
    setUpdatingJobId(job.id);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, ...(nextStatus === "ARCHIVED" ? { archiveConfirmation: "ARCHIVE" } : {}) }) });
      const result = await response.json() as { data?: Job; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Job status update nahi hua.");
      setJobs((current) => current.map((item) => item.id === job.id ? result.data! : item));
      setMessage(`${job.title} ${statusMessage(nextStatus)}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Job status update nahi hua.");
    } finally {
      setUpdatingJobId(undefined);
      mutationLock.current = false;
    }
  }

  async function duplicate(job: Job) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setUpdatingJobId(job.id); setError(undefined); setMessage(undefined);
    try { const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "duplicate" }) }); const result = await response.json() as { data?: Job; error?: string; message?: string }; if (!response.ok || !result.data) throw new Error(result.error ?? "Job duplicate nahi hua."); setJobs((current) => [result.data!, ...current]); setMessage(result.message ?? "Job duplicated as a draft."); resetFilters(); }
    catch (duplicateError) { setError(duplicateError instanceof Error ? duplicateError.message : "Job duplicate nahi hua."); }
    finally { setUpdatingJobId(undefined); mutationLock.current = false; }
  }

  const filtersActive = Boolean(query || status !== "ALL" || (canChooseVertical && vertical !== "ALL"));
  const editingJob = editingJobId ? jobs.find((job) => job.id === editingJobId) : undefined;


  function resetFilters() { setQuery(""); setStatus("ALL"); setVertical(canChooseVertical ? "ALL" : defaultVertical); setPage(1); }
  const { pageSize, pageCount, currentPage, visibleJobs } = paginateJobs(filteredJobs, page);
  function goToPage(value: number) { setPage(value); list.current?.scrollIntoView({ block: "start" }); }
  const busy = Boolean(saving || updatingJobId);
  const filterCount = Number(status !== "ALL") + Number(canChooseVertical && vertical !== "ALL");

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><p className={styles.eyebrow}>RECRUITMENT WORKSPACE</p><h1>Manage your jobs<span>.</span></h1><p>From the first draft to the right hire. Keep every vacancy in order.</p></div><button type="button" disabled={busy} onClick={openCreateModal} className={styles.primaryButton}><Plus size={17} />Create job</button></header>
      {message && <div className={styles.success} role="status"><span>{message}</span><button type="button" onClick={() => setMessage(undefined)} aria-label="Dismiss message"><X size={17} /></button></div>}
      {error && !modalOpen && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={17} /></button></div>}
      {loadError && <div className={styles.error} role="alert"><span>{loadError} {jobs.length > 0 && "Previously loaded jobs are shown below."}</span><button type="button" disabled={loading || busy} onClick={() => void loadJobs()}>Retry</button></div>}
      <section className={styles.stats} aria-label="Job statistics">
        <SummaryCard label="Total jobs" value={loading || loadError ? "—" : counts.total} icon={BriefcaseBusiness} tone="blue" />
        <SummaryCard label="Published" value={loading || loadError ? "—" : counts.published} icon={CheckCircle2} tone="green" />
        <SummaryCard label="Draft / pending" value={loading || loadError ? "—" : counts.draft} icon={FileClock} tone="orange" />
        <SummaryCard label="Paused" value={loading || loadError ? "—" : counts.paused} icon={PauseCircle} tone="purple" />
      </section>
      <section className={styles.filters} aria-label="Filter jobs">
        <div className={styles.searchRow}><label className={styles.search}><Search size={18} /><span className={styles.srOnly}>Search jobs by title, company, category, city or ID</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search title, company, city or ID..." /></label><button className={styles.filterToggle} type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="job-filters"><SlidersHorizontal size={17} /><span>Filters{filterCount > 0 ? ` (${filterCount})` : ""}</span></button><button type="button" className={styles.refresh} disabled={loading || busy} onClick={() => void loadJobs()} aria-label="Refresh job listings"><RefreshCw size={17} className={loading ? styles.spin : undefined} /></button></div>
        <div id="job-filters" className={`${styles.filterFields} ${filtersOpen ? styles.filtersOpen : ""}`}>
          {canChooseVertical && <label>Business field<select value={vertical} onChange={(event) => { setVertical(event.target.value as "ALL" | BusinessVertical); setPage(1); }}><option value="ALL">All business fields</option>{allowedVerticals.map((item) => <option key={item} value={item}>{BUSINESS_VERTICAL_LABELS[item]}</option>)}</select></label>}
          <label>Publication status<select value={status} onChange={(event) => { setStatus(event.target.value as "ALL" | JobStatus); setPage(1); }}><option value="ALL">All statuses</option>{jobStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
          <p>Search and filters apply to jobs in your workspace.</p>
        </div>
        {filtersActive && <div className={styles.activeFilters}><span>{query.trim() ? `Search: ${query.trim()}` : "Filtered results"}{status !== "ALL" ? ` · ${formatLabel(status)}` : ""}{canChooseVertical && vertical !== "ALL" ? ` · ${BUSINESS_VERTICAL_LABELS[vertical]}` : ""}</span><button type="button" onClick={resetFilters}><X size={13} />Clear filters</button></div>}
      </section>
      <section ref={list} className={styles.listSection} aria-labelledby="job-list-title" aria-busy={loading}>
        <div className={styles.listHeader}><div><h2 id="job-list-title">{filtersActive ? "Matching jobs" : "All job listings"}</h2><p>Latest postings first</p></div><span role="status">{loading ? "Loading..." : loadError ? "Refresh needed" : `${filteredJobs.length} of ${jobs.length} jobs`}</span></div>
        {loading && !jobs.length ? <div className={styles.skeletons} role="status"><span className={styles.srOnly}>Loading job listings</span>{[1,2,3].map((item) => <div key={item} />)}</div> : !loadError || jobs.length ? <>
          {visibleJobs.length > 0 && <><p className={styles.scrollHint}>Swipe horizontally to see all columns and actions →</p><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Job listings table"><table className={styles.jobsTable}><thead><tr><th scope="col">Job &amp; company</th><th scope="col">Location &amp; salary</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{visibleJobs.map((job) => <JobRow key={job.id} job={job} disabled={busy || loading} updating={updatingJobId === job.id} onEdit={openEditModal} onStatus={updateStatus} onDuplicate={duplicate} />)}</tbody></table></div></>}
          {!filteredJobs.length && <div className={styles.empty}><BriefcaseBusiness size={29} /><h3>{jobs.length ? "No matching jobs" : "Your next hire starts here."}</h3><p>{jobs.length ? "Try another search or clear your filters to see more vacancies." : "Create a vacancy, save a draft and publish when you are ready."}</p><button type="button" className={styles.primaryButton} onClick={jobs.length ? resetFilters : openCreateModal}>{jobs.length ? "Clear filters" : "Create your first job"}</button></div>}
          {filteredJobs.length > 0 && <div className={styles.pagination}><span>Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredJobs.length)}</span><div><button type="button" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><span>Page {currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => goToPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div>}
        </> : <div className={styles.empty}><BriefcaseBusiness size={29} /><h3>We couldn&apos;t load your jobs.</h3><p>Use Retry above to reconnect. Your listings have not been changed.</p></div>}
      </section>
      {modalOpen && <dialog ref={dialog} aria-labelledby="job-form-title" className={styles.dialog} onCancel={(event) => { event.preventDefault(); if (!saving) closeModal(); }}>
        <section className={styles.dialogInner}>
          <header className={styles.dialogHeader}>
            <div><p className="text-xs font-black tracking-[.1em] text-[#2447e5]">{editingJob ? "EDIT VACANCY" : "NEW VACANCY"}</p><h2 id="job-form-title" className="mt-1 text-2xl font-black">{editingJob ? `Edit ${editingJob.title}` : "Create a job"}</h2><p className="mt-1 text-xs text-[#778198]">{editingJob ? `Job ID: ${editingJob.id} · Current status: ${formatLabel(editingJob.status)}` : "Draft save karein ya details ready hain to directly publish karein."}</p></div>
            <button type="button" disabled={Boolean(saving)} onClick={closeModal} aria-label="Close job form" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0f3fa] text-[#58657d] disabled:opacity-50"><X size={19} /></button>
          </header>
          <form onSubmit={submit} className={styles.jobForm}>
            <fieldset disabled={Boolean(saving)} className={styles.formScroll}>
              {error && <p role="alert" className={styles.error}>{error}</p>}
              {loading && <p className={styles.formNotice} role="status">Loading workspace. You can fill in details while you wait.</p>}
              <FormSection title="Role and employer" description="Vacancy ki basic details">
                <div className={styles.formGrid}>
                  <Field label="Job title" required><input className="admin-input" required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Security Guard" autoFocus /></Field>
                  <Field label="Employer / client" required><input className="admin-input" required value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="Company name" /></Field>
                  {canChooseVertical && <Field label="Business field" required><select className="admin-input" value={form.businessVertical} onChange={(event) => { const next = event.target.value as BusinessVertical; setForm((current) => ({ ...current, businessVertical: next, category: "" })); }}>{allowedVerticals.map((item) => <option key={item} value={item}>{BUSINESS_VERTICAL_LABELS[item]}</option>)}</select></Field>}
                  <Field label="Job category" required><input className="admin-input" required list="job-category-options" value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="Security Guard" /><datalist id="job-category-options">{categorySuggestions[form.businessVertical].map((item) => <option key={item} value={item} />)}</datalist></Field>
                  <Field label="Job role"><input className="admin-input" value={form.jobRole} onChange={(event) => update("jobRole", event.target.value)} placeholder="Night Security Guard" /></Field>
                </div>
              </FormSection>

              <FormSection title="Location and compensation" description="Posting ki jagah, salary aur vacancies">
                <div className={styles.formGrid}>
                  <Field label="City" required><input className="admin-input" required value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
                  <Field label="District" required><input className="admin-input" required value={form.district} onChange={(event) => update("district", event.target.value)} /></Field>
                  <Field label="Vacancies" required><input className="admin-input" required type="number" min="1" value={form.vacancies} onChange={(event) => update("vacancies", event.target.value)} /></Field>
                  <Field label="Minimum monthly salary" required><input className="admin-input" required type="number" min="0" value={form.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} placeholder="12000" /></Field>
                  <Field label="Maximum monthly salary" required><input className="admin-input" required type="number" min={form.salaryMin || "0"} value={form.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} placeholder="18000" /></Field>
                  <Field label="Employment type" required><select className="admin-input" value={form.employmentType} onChange={(event) => update("employmentType", event.target.value as Job["employmentType"])}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option></select></Field>
                </div>
              </FormSection>

              <FormSection title="Requirements and schedule" description="Candidate eligibility aur application details">
                <div className={styles.formGrid}>
                  <Field label="Shift"><select className="admin-input" value={form.shift} onChange={(event) => update("shift", event.target.value as NonNullable<Job["shift"]>)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="ROTATIONAL">Rotational</option></select></Field>
                  <Field label="Minimum qualification"><input className="admin-input" value={form.qualification} onChange={(event) => update("qualification", event.target.value)} placeholder="10th pass" /></Field>
                  <Field label="Application deadline"><input className="admin-input" type="date" value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} /></Field>
                  <Field label="Minimum experience (years)"><input className="admin-input" type="number" step="any" min="0" value={form.minExperience} onChange={(event) => update("minExperience", event.target.value)} /></Field>
                  <Field label="Maximum experience (years)"><input className="admin-input" type="number" step="any" min={form.minExperience || "0"} value={form.maxExperience} onChange={(event) => update("maxExperience", event.target.value)} /></Field>
                  <label className={styles.urgentCheckbox}><input type="checkbox" checked={form.urgent} onChange={(event) => update("urgent", event.target.checked)} className="h-4 w-4 accent-[#2447e5]" />Mark as urgent hiring</label>
                  <div className={styles.fullField}><Field label="Job description"><textarea className="admin-input min-h-28 py-3" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Responsibilities, required skills aur joining information..." /></Field></div>
                  <div className={styles.fullField}><Field label="Benefits"><textarea className="admin-input min-h-20 py-3" value={form.benefits} onChange={(event) => update("benefits", event.target.value)} placeholder="PF, ESI, accommodation — har benefit nayi line ya comma se alag likhein" /></Field></div>
                </div>
              </FormSection>
            </fieldset>
            <footer className={styles.formFooter}>
              <button type="button" disabled={Boolean(saving)} onClick={closeModal} className="rounded-lg border border-[#dfe4ef] px-4 py-2.5 text-sm font-bold text-[#58657d] disabled:opacity-50">Cancel</button>
              <button type="submit" value={editingJob ? "save" : "draft"} disabled={Boolean(saving) || loading} className="rounded-lg border border-[#2447e5] px-4 py-2.5 text-sm font-black text-[#2447e5] disabled:opacity-50">{saving === "draft" || saving === "save" ? "Saving..." : editingJob ? "Save changes" : "Save draft"}</button>
              {(!editingJob || editingJob.status !== "PUBLISHED") && <button type="submit" value="publish" disabled={Boolean(saving) || loading} className="inline-flex items-center gap-2 rounded-lg bg-[#2447e5] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 size={16} />{saving === "publish" ? "Publishing..." : editingJob ? "Save & publish" : "Create & publish"}</button>}
            </footer>
          </form>
        </section>
      </dialog>}
    </main>
  );
}

function JobRow({ job, disabled, updating, onEdit, onStatus, onDuplicate }: { job: Job; disabled: boolean; updating: boolean; onEdit: (job: Job) => void; onStatus: (job: Job, status: JobStatus) => void; onDuplicate: (job: Job) => void }) {
  const vertical = job.businessVertical ?? inferBusinessVertical(job.category);
  return <tr aria-label={job.title} aria-busy={updating}>
    <td><div className={styles.jobIdentity}><span className={styles.jobIcon}><BriefcaseBusiness size={20} /></span><div><div className={styles.titleRow}><h3>{job.title}</h3>{job.urgent && <span className={styles.urgent}>Urgent</span>}</div><p>{job.company}</p><small>{BUSINESS_VERTICAL_LABELS[vertical]} · {job.id}</small></div></div></td>
    <td><div className={styles.jobFacts}><p><MapPin size={14} /><span>{job.city}</span><span className={styles.dot}>·</span><span>{formatLabel(job.employmentType)}</span></p><p className={styles.salary}><IndianRupee size={14} /><span>{money.format(job.salaryMin)}–{money.format(job.salaryMax)} <small>/ month</small></span></p><p><UsersRound size={13} />{job.vacancies} {job.vacancies === 1 ? "vacancy" : "vacancies"}<span className={styles.dot}>·</span><span>Posted {formatDate(job.postedAt)}</span></p></div></td>
    <td><StatusBadge status={job.status} /></td>
    <td><div className={styles.jobActions}><button type="button" className={styles.editButton} disabled={disabled} onClick={() => onEdit(job)} aria-label={`Edit ${job.title}`}><Pencil size={14} />Edit</button><button type="button" className={job.status === "PUBLISHED" ? styles.pauseButton : styles.publishButton} disabled={disabled} onClick={() => onStatus(job, job.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED")}>{updating ? "Updating..." : job.status === "PUBLISHED" ? "Pause" : "Publish"}</button>
      <details className={styles.moreActions} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); } }} onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.removeAttribute("open"); }}>
        <summary aria-label={`More actions for ${job.title}`}><MoreHorizontal size={20} /><span>More</span></summary>
        <div className={styles.morePanel}><p>{job.title}</p><label>Change status<select disabled={disabled} value={job.status} onChange={(event) => onStatus(job, event.target.value as JobStatus)}>{jobStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label><button type="button" disabled={disabled} onClick={() => onDuplicate(job)}><Copy size={15} />Duplicate as draft</button><button type="button" disabled={disabled || job.status === "ARCHIVED"} onClick={() => onStatus(job, "ARCHIVED")} className={styles.archiveAction}><Archive size={15} />Archive job</button>{job.status === "PUBLISHED" && <a href={`/jobs/${encodeURIComponent(job.id)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />View public listing<span className={styles.srOnly}> (opens in a new tab)</span></a>}</div>
      </details>
    </div></td>
  </tr>;
}
function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: typeof BriefcaseBusiness; tone: string }) {
  return <article className={styles[tone]}><span><Icon size={19} /></span><div><strong>{typeof value === "number" ? value.toLocaleString("en-IN") : value}</strong><p>{label}</p></div></article>;
}
function StatusBadge({ status }: { status: JobStatus }) {
  const tone = status === "PUBLISHED" ? "green" : status === "DRAFT" || status === "PENDING" ? "orange" : status === "PAUSED" ? "purple" : "neutral";
  return <span className={`${styles.status} ${styles[tone]}`}>{formatLabel(status)}</span>;
}
function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className={styles.formSection}><div><h3>{title}</h3><p>{description}</p></div>{children}</section>;
}
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <em> *</em>}</span>{children}</label>;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
function statusMessage(status: JobStatus) {
  if (status === "PUBLISHED") return "published ho gayi";
  if (status === "PAUSED") return "pause ho gayi";
  if (status === "CLOSED") return "close ho gayi";
  return `${formatLabel(status)} mein update ho gayi`;
}
function filterJobs(jobs: Job[], query: string, status: "ALL" | JobStatus, vertical: "ALL" | BusinessVertical) {
  const normalizedQuery = query.trim().toLowerCase();
  return jobs.filter((job) => {
    const jobVertical = job.businessVertical ?? inferBusinessVertical(job.category);
    const matchesQuery = !normalizedQuery || [job.title, job.company, job.category, job.city, job.district, job.id].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (status === "ALL" || job.status === status) && (vertical === "ALL" || jobVertical === vertical);
  });
}
function paginateJobs(jobs: Job[], page: number) {
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(jobs.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  return { pageSize, pageCount, currentPage, visibleJobs: jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize) };
}
