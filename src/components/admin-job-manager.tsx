"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BriefcaseBusiness, CheckCircle2, Copy, ExternalLink, FileClock, IndianRupee, MapPin, PauseCircle, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, inferBusinessVertical, type BusinessVertical } from "@/lib/admin-scope";
import type { Job, JobStatus } from "@/lib/portal";

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

export function AdminJobManager({ allowedVerticals, canChooseVertical }: { allowedVerticals: BusinessVertical[]; canChooseVertical: boolean }) {
  const defaultVertical = allowedVerticals[0] ?? "RECRUITMENT";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | JobStatus>("ALL");
  const [vertical, setVertical] = useState<"ALL" | BusinessVertical>(canChooseVertical ? "ALL" : defaultVertical);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string>();
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultVertical));
  const [saving, setSaving] = useState<"draft" | "save" | "publish">();
  const [updatingJobId, setUpdatingJobId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/jobs");
      const result = await response.json() as { data?: Job[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Jobs load nahi ho sake.");
      setJobs(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Jobs load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadJobs(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadJobs]);
  useEffect(() => {
    if (!modalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setModalOpen(false);
        setEditingJobId(undefined);
        setError(undefined);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [modalOpen, saving]);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const normalizedQuery = query.trim().toLowerCase();
    const jobVertical = job.businessVertical ?? inferBusinessVertical(job.category);
    const matchesQuery = !normalizedQuery || [job.title, job.company, job.category, job.city, job.district, job.id].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (status === "ALL" || job.status === status) && (vertical === "ALL" || jobVertical === vertical);
  }), [jobs, query, status, vertical]);

  const counts = useMemo(() => ({
    total: jobs.length,
    published: jobs.filter((job) => job.status === "PUBLISHED").length,
    draft: jobs.filter((job) => job.status === "DRAFT" || job.status === "PENDING").length,
    paused: jobs.filter((job) => job.status === "PAUSED").length,
  }), [jobs]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }));

  function openCreateModal() {
    setEditingJobId(undefined);
    setForm(emptyForm(defaultVertical));
    setError(undefined);
    setModalOpen(true);
  }

  function openEditModal(job: Job) {
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
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publishNow = submitter?.value === "publish";
    const isEditing = Boolean(editingJobId);
    setSaving(publishNow ? "publish" : isEditing ? "save" : "draft");
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(isEditing ? `/api/admin/jobs/${editingJobId}` : "/api/admin/jobs", {
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
      closeModal();
      setMessage(result.message ?? (isEditing ? "Job details updated." : publishNow ? "Job published." : "Job draft saved."));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Job save nahi ho saka.");
    } finally {
      setSaving(undefined);
    }
  }

  async function updateStatus(job: Job, nextStatus: JobStatus) {
    if (job.status === nextStatus) return;
    if (nextStatus === "ARCHIVED" && !window.confirm(`${job.title} ko archive karein? Ye public listing se remove ho jayegi.`)) return;
    setUpdatingJobId(job.id);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, ...(nextStatus === "ARCHIVED" ? { archiveConfirmation: "ARCHIVE" } : {}) }) });
      const result = await response.json() as { data?: Job; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Job status update nahi hua.");
      setJobs((current) => current.map((item) => item.id === job.id ? result.data! : item));
      setMessage(`${job.title} ${statusMessage(nextStatus)}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Job status update nahi hua.");
    } finally {
      setUpdatingJobId(undefined);
    }
  }

  async function duplicate(job: Job) {
    setUpdatingJobId(job.id); setError(undefined); setMessage(undefined);
    try { const response = await fetch(`/api/admin/jobs/${job.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "duplicate" }) }); const result = await response.json() as { data?: Job; error?: string; message?: string }; if (!response.ok || !result.data) throw new Error(result.error ?? "Job duplicate nahi hua."); setJobs((current) => [result.data!, ...current]); setMessage(result.message); }
    catch (duplicateError) { setError(duplicateError instanceof Error ? duplicateError.message : "Job duplicate nahi hua."); }
    finally { setUpdatingJobId(undefined); }
  }

  const filtersActive = Boolean(query || status !== "ALL" || (canChooseVertical && vertical !== "ALL"));
  const editingJob = editingJobId ? jobs.find((job) => job.id === editingJobId) : undefined;

  return (
    <main className="min-h-screen bg-[#F5F7F5] text-[#25372E]">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="section-kicker text-[#E95D2B]">RECRUITMENT CONTROL</p>
            <h1 className="mt-2 text-3xl font-black">Job management</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#71837A]">Nayi vacancy banayein, draft review karein aur public website par job publish, pause ya close karein.</p>
          </div>
          <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-[#E95D2B] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#D94E1F]"><Plus size={18} /> Create job</button>
        </div>

        {message && <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]"><span>{message}</span><button type="button" onClick={() => setMessage(undefined)} aria-label="Dismiss message"><X size={16} /></button></div>}
        {error && !modalOpen && <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]"><span>{error}</span><button type="button" onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={16} /></button></div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total jobs" value={counts.total} icon={BriefcaseBusiness} color="bg-[#EAF1FF] text-[#3D69BE]" />
          <SummaryCard label="Published" value={counts.published} icon={CheckCircle2} color="bg-[#E8F5ED] text-[#258653]" />
          <SummaryCard label="Draft / pending" value={counts.draft} icon={FileClock} color="bg-[#FFF0E7] text-[#C9471E]" />
          <SummaryCard label="Paused" value={counts.paused} icon={PauseCircle} color="bg-[#FFF7D9] text-[#8A6810]" />
        </section>

        <section className="mt-6 rounded-xl border border-[#E0E8E2] bg-white p-4">
          <div className={`grid gap-3 ${canChooseVertical ? "lg:grid-cols-[1fr_210px_230px_auto]" : "lg:grid-cols-[1fr_230px_auto]"}`}>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E7E2] px-3 focus-within:border-[#E95D2B] focus-within:ring-2 focus-within:ring-[#FFE1D1]"><Search size={18} className="text-[#E95D2B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, company, category, city ya Job ID" className="min-w-0 flex-1 text-sm outline-none" /></label>
            {canChooseVertical && <select value={vertical} onChange={(event) => setVertical(event.target.value as "ALL" | BusinessVertical)} className="admin-input"><option value="ALL">All business fields</option>{allowedVerticals.map((item) => <option key={item} value={item}>{BUSINESS_VERTICAL_LABELS[item]}</option>)}</select>}
            <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | JobStatus)} className="admin-input"><option value="ALL">All statuses</option>{jobStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
            {filtersActive ? <button type="button" onClick={() => { setQuery(""); setStatus("ALL"); setVertical(canChooseVertical ? "ALL" : defaultVertical); }} className="h-11 rounded-lg border border-[#DCE6DF] px-4 text-sm font-bold text-[#52665C]">Clear filters</button> : <span className="inline-flex h-11 items-center justify-center rounded-lg bg-[#35231C] px-4 text-sm font-bold text-white">{loading ? "Loading..." : `${filteredJobs.length} jobs`}</span>}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-[#E0E8E2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EEE9] px-5 py-4">
            <div><h2 className="font-black">All job listings</h2><p className="mt-1 text-xs text-[#71837A]">Status change hote hi public website visibility update ho jayegi.</p></div>
            <span className="rounded-full bg-[#F3F7F4] px-3 py-1.5 text-xs font-bold text-[#65786D]">Showing {filteredJobs.length} of {jobs.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-[#F7FAF8] text-xs font-bold text-[#71837A]"><tr><th className="px-5 py-3">JOB</th><th>BUSINESS FIELD</th><th>LOCATION</th><th>SALARY / VACANCY</th><th>POSTED</th><th>STATUS</th><th className="px-5">ACTION</th></tr></thead>
              <tbody>{filteredJobs.map((job) => {
                const jobVertical = job.businessVertical ?? inferBusinessVertical(job.category);
                const busy = updatingJobId === job.id;
                return <tr key={job.id} className="border-t border-[#EDF1EE] align-top hover:bg-[#FCFDFC]">
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><p className="font-black">{job.title}</p>{job.urgent && <span className="rounded-full bg-[#FFF0E7] px-2 py-0.5 text-[10px] font-black text-[#C9471E]">URGENT</span>}</div><p className="mt-1 text-xs text-[#71837A]">{job.company}</p><p className="mt-1 text-[11px] font-semibold text-[#9AA8A1]">{job.id}</p></td>
                  <td className="py-4"><BusinessBadge vertical={jobVertical} /><p className="mt-2 text-xs text-[#71837A]">{job.category}</p></td>
                  <td className="py-4"><p className="inline-flex items-center gap-1.5 font-semibold"><MapPin size={14} className="text-[#E95D2B]" />{job.city}</p><p className="mt-1 text-xs text-[#71837A]">{job.district}</p></td>
                  <td className="py-4"><p className="inline-flex items-center font-bold"><IndianRupee size={14} />{money.format(job.salaryMin)}–{money.format(job.salaryMax)}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-[#71837A]"><UsersRound size={13} />{job.vacancies} vacancies</p></td>
                  <td className="py-4"><p className="font-semibold">{new Date(job.postedAt).toLocaleDateString("en-IN")}</p><p className="mt-1 text-xs text-[#71837A]">{formatLabel(job.employmentType)}</p></td>
                  <td className="py-4"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={() => openEditModal(job)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#F0B9A4] bg-[#FFF6F1] px-3 text-xs font-black text-[#C9471E] disabled:opacity-50"><Pencil size={14} />Edit</button><button type="button" disabled={busy} onClick={() => void duplicate(job)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#DCE6DF] px-3 text-xs font-black text-[#52665C] disabled:opacity-50"><Copy size={14} />Duplicate</button><button type="button" disabled={busy} onClick={() => updateStatus(job, job.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED")} className={`rounded-md px-3 py-2 text-xs font-black text-white disabled:opacity-50 ${job.status === "PUBLISHED" ? "bg-[#9A7413]" : "bg-[#157A4A]"}`}>{busy ? "Updating..." : job.status === "PUBLISHED" ? "Pause" : "Publish"}</button><select aria-label={`Change ${job.title} status`} disabled={busy} value={job.status} onChange={(event) => void updateStatus(job, event.target.value as JobStatus)} className="h-9 rounded-md border border-[#DCE6DF] bg-white px-2 text-xs font-bold text-[#52665C] disabled:opacity-50">{jobStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><button type="button" disabled={busy || job.status === "ARCHIVED"} onClick={() => void updateStatus(job, "ARCHIVED")} aria-label={`Archive ${job.title}`} className="grid h-9 w-9 place-items-center rounded-md border border-[#DCE6DF] text-[#52665C] disabled:opacity-40"><Archive size={14} /></button>{job.status === "PUBLISHED" && <a href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" aria-label={`View ${job.title}`} className="grid h-9 w-9 place-items-center rounded-md border border-[#DCE6DF] text-[#52665C]"><ExternalLink size={15} /></a>}</div></td>
                </tr>;
              })}{!loading && !filteredJobs.length && <tr><td colSpan={7} className="px-5 py-16 text-center"><BriefcaseBusiness size={30} className="mx-auto text-[#B4C0BA]" /><p className="mt-3 font-bold text-[#52665C]">Koi matching job nahi mili</p><p className="mt-1 text-xs text-[#8A9991]">Filters clear karein ya nayi job create karein.</p></td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>

      {modalOpen && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeModal(); }} className="fixed inset-0 z-50 grid place-items-center bg-[#18221D]/70 p-3 backdrop-blur-sm sm:p-6">
        <section role="dialog" aria-modal="true" aria-labelledby="job-form-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#F5F7F5] shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-[#DFE8E1] bg-white px-5 py-4 sm:px-7">
            <div><p className="text-xs font-black tracking-[.1em] text-[#E95D2B]">{editingJob ? "EDIT VACANCY" : "NEW VACANCY"}</p><h2 id="job-form-title" className="mt-1 text-2xl font-black">{editingJob ? `Edit ${editingJob.title}` : "Create a job"}</h2><p className="mt-1 text-xs text-[#71837A]">{editingJob ? `Job ID: ${editingJob.id} · Current status: ${formatLabel(editingJob.status)}` : "Draft save karein ya details ready hain to directly publish karein."}</p></div>
            <button type="button" disabled={Boolean(saving)} onClick={closeModal} aria-label="Close job form" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F7F4] text-[#52665C] disabled:opacity-50"><X size={19} /></button>
          </header>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {error && <p className="mb-5 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]">{error}</p>}
              <FormSection title="Role and employer" description="Vacancy ki basic details">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Job title" required><input className="admin-input" required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Security Guard" autoFocus /></Field>
                  <Field label="Employer / client" required><input className="admin-input" required value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="Company name" /></Field>
                  {canChooseVertical && <Field label="Business field" required><select className="admin-input" value={form.businessVertical} onChange={(event) => { const next = event.target.value as BusinessVertical; setForm((current) => ({ ...current, businessVertical: next, category: "" })); }}>{allowedVerticals.map((item) => <option key={item} value={item}>{BUSINESS_VERTICAL_LABELS[item]}</option>)}</select></Field>}
                  <Field label="Job category" required><input className="admin-input" required list="job-category-options" value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="Security Guard" /><datalist id="job-category-options">{categorySuggestions[form.businessVertical].map((item) => <option key={item} value={item} />)}</datalist></Field>
                  <Field label="Job role"><input className="admin-input" value={form.jobRole} onChange={(event) => update("jobRole", event.target.value)} placeholder="Night Security Guard" /></Field>
                </div>
              </FormSection>

              <FormSection title="Location and compensation" description="Posting ki jagah, salary aur vacancies">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="City" required><input className="admin-input" required value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
                  <Field label="District" required><input className="admin-input" required value={form.district} onChange={(event) => update("district", event.target.value)} /></Field>
                  <Field label="Vacancies" required><input className="admin-input" required type="number" min="1" value={form.vacancies} onChange={(event) => update("vacancies", event.target.value)} /></Field>
                  <Field label="Minimum monthly salary" required><input className="admin-input" required type="number" min="0" value={form.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} placeholder="12000" /></Field>
                  <Field label="Maximum monthly salary" required><input className="admin-input" required type="number" min="0" value={form.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} placeholder="18000" /></Field>
                  <Field label="Employment type" required><select className="admin-input" value={form.employmentType} onChange={(event) => update("employmentType", event.target.value as Job["employmentType"])}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="TEMPORARY">Temporary</option></select></Field>
                </div>
              </FormSection>

              <FormSection title="Requirements and schedule" description="Candidate eligibility aur application details">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Shift"><select className="admin-input" value={form.shift} onChange={(event) => update("shift", event.target.value as NonNullable<Job["shift"]>)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="ROTATIONAL">Rotational</option></select></Field>
                  <Field label="Minimum qualification"><input className="admin-input" value={form.qualification} onChange={(event) => update("qualification", event.target.value)} placeholder="10th pass" /></Field>
                  <Field label="Application deadline"><input className="admin-input" type="date" value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} /></Field>
                  <Field label="Minimum experience (years)"><input className="admin-input" type="number" min="0" value={form.minExperience} onChange={(event) => update("minExperience", event.target.value)} /></Field>
                  <Field label="Maximum experience (years)"><input className="admin-input" type="number" min="0" value={form.maxExperience} onChange={(event) => update("maxExperience", event.target.value)} /></Field>
                  <label className="flex h-11 items-center gap-3 self-end rounded-md border border-[#E1E7E2] bg-white px-3 text-sm font-bold"><input type="checkbox" checked={form.urgent} onChange={(event) => update("urgent", event.target.checked)} className="h-4 w-4 accent-[#E95D2B]" />Mark as urgent hiring</label>
                  <div className="md:col-span-3"><Field label="Job description"><textarea className="admin-input min-h-28 py-3" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Responsibilities, required skills aur joining information..." /></Field></div>
                  <div className="md:col-span-3"><Field label="Benefits"><textarea className="admin-input min-h-20 py-3" value={form.benefits} onChange={(event) => update("benefits", event.target.value)} placeholder="PF, ESI, accommodation — har benefit nayi line ya comma se alag likhein" /></Field></div>
                </div>
              </FormSection>
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[#DFE8E1] bg-white px-5 py-4 sm:px-7">
              <button type="button" disabled={Boolean(saving)} onClick={closeModal} className="rounded-lg border border-[#DCE6DF] px-4 py-2.5 text-sm font-bold text-[#52665C] disabled:opacity-50">Cancel</button>
              <button type="submit" value={editingJob ? "save" : "draft"} disabled={Boolean(saving)} className="rounded-lg border border-[#E95D2B] px-4 py-2.5 text-sm font-black text-[#C9471E] disabled:opacity-50">{saving === "draft" || saving === "save" ? "Saving..." : editingJob ? "Save changes" : "Save draft"}</button>
              {(!editingJob || editingJob.status !== "PUBLISHED") && <button type="submit" value="publish" disabled={Boolean(saving)} className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 size={16} />{saving === "publish" ? "Publishing..." : editingJob ? "Save & publish" : "Create & publish"}</button>}
            </footer>
          </form>
        </section>
      </div>}
    </main>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof BriefcaseBusiness; color: string }) {
  return <article className="rounded-xl border border-[#E0E8E2] bg-white p-5"><div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon size={19} /></span><span className="text-3xl font-black">{value}</span></div><p className="mt-4 text-sm font-bold text-[#65786D]">{label}</p></article>;
}

function BusinessBadge({ vertical }: { vertical: BusinessVertical }) {
  const styles: Record<BusinessVertical, string> = { RECRUITMENT: "bg-[#EAF1FF] text-[#3D69BE]", SECURITY: "bg-[#FFF0E7] text-[#C9471E]", BABY_CARE: "bg-[#F6ECFF] text-[#7F4BB0]", HOUSEKEEPING: "bg-[#E8F5ED] text-[#258653]", PEST_CONTROL: "bg-[#FFF7D9] text-[#8A6810]" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[vertical]}`}>{BUSINESS_VERTICAL_LABELS[vertical]}</span>;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const style = status === "PUBLISHED" ? "bg-[#E8F5ED] text-[#258653]" : status === "DRAFT" || status === "PENDING" ? "bg-[#FFF0E7] text-[#C9471E]" : status === "PAUSED" ? "bg-[#FFF7D9] text-[#8A6810]" : "bg-[#EEF1EF] text-[#52665C]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${style}`}>{formatLabel(status)}</span>;
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="mb-5 rounded-xl border border-[#E0E8E2] bg-white p-5 last:mb-0"><div className="mb-5"><h3 className="font-black">{title}</h3><p className="mt-1 text-xs text-[#71837A]">{description}</p></div>{children}</section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#43564C]"><span>{label}{required && <span className="text-[#E95D2B]"> *</span>}</span>{children}</label>;
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
