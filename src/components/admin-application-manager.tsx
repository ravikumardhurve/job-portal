"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, ExternalLink, FilterX, MapPin, Search, UserRound, UsersRound, X } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, BUSINESS_VERTICALS, inferBusinessVertical, type BusinessVertical } from "@/lib/admin-scope";
import type { Application, ApplicationStatus, Candidate, Job } from "@/lib/portal";

type AdminApplication = Application & { candidate?: Candidate; job?: Job };

const statuses: ApplicationStatus[] = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "JOINING_SCHEDULED", "JOINED", "REJECTED", "WITHDRAWN"];
const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function AdminApplicationManager() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ApplicationStatus>("ALL");
  const [vertical, setVertical] = useState<"ALL" | BusinessVertical>("ALL");
  const [jobId, setJobId] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [updatingId, setUpdatingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/applications");
      const result = await response.json() as { data?: AdminApplication[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Applications load nahi ho sake.");
      setApplications(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Applications load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !updatingId) setSelectedId(undefined); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", close); };
  }, [selectedId, updatingId]);

  const jobOptions = useMemo(() => {
    const map = new Map<string, Job>();
    for (const application of applications) if (application.job) map.set(application.job.id, application.job);
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [applications]);
  const cityOptions = useMemo(() => [...new Set(applications.map((item) => item.job?.city ?? item.candidate?.city).filter((value): value is string => Boolean(value)))].sort(), [applications]);

  const filteredApplications = useMemo(() => applications.filter((application) => {
    const normalizedQuery = query.trim().toLowerCase();
    const jobVertical = application.job ? application.job.businessVertical ?? inferBusinessVertical(application.job.category) : undefined;
    const searchable = [application.id, application.candidateId, application.jobId, application.candidate?.fullName, application.candidate?.mobile, application.candidate?.email, application.job?.title, application.job?.company, application.job?.category, application.job?.city].filter(Boolean).join(" ").toLowerCase();
    const appliedDate = application.appliedAt.slice(0, 10);
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (status === "ALL" || application.status === status)
      && (vertical === "ALL" || jobVertical === vertical)
      && (jobId === "ALL" || application.jobId === jobId)
      && (city === "ALL" || application.job?.city === city || application.candidate?.city === city)
      && (!dateFrom || appliedDate >= dateFrom)
      && (!dateTo || appliedDate <= dateTo);
  }), [applications, city, dateFrom, dateTo, jobId, query, status, vertical]);

  const counts = useMemo(() => ({
    total: applications.length,
    review: applications.filter((item) => item.status === "APPLIED" || item.status === "UNDER_REVIEW").length,
    shortlisted: applications.filter((item) => item.status === "SHORTLISTED").length,
    interviews: applications.filter((item) => item.status === "INTERVIEW_SCHEDULED" || item.status === "INTERVIEWED").length,
    selected: applications.filter((item) => ["SELECTED", "JOINING_SCHEDULED", "JOINED"].includes(item.status)).length,
  }), [applications]);

  const selected = applications.find((application) => application.id === selectedId);
  const filtersActive = Boolean(query || status !== "ALL" || vertical !== "ALL" || jobId !== "ALL" || city !== "ALL" || dateFrom || dateTo);

  async function update(application: AdminApplication, nextStatus: ApplicationStatus) {
    if (application.status === nextStatus) return;
    setUpdatingId(application.id);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json() as { data?: Application; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Application status update nahi hua.");
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...result.data } : item));
      setMessage(`${application.candidate?.fullName ?? "Candidate"} ki application ${formatLabel(nextStatus)} stage par move ho gayi.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Application status update nahi hua.");
    } finally {
      setUpdatingId(undefined);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatus("ALL");
    setVertical("ALL");
    setJobId("ALL");
    setCity("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <main className="min-h-screen bg-[#F5F7F5] text-[#25372E]">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="section-kicker text-[#E95D2B]">RECRUITMENT PIPELINE</p><h1 className="mt-2 text-3xl font-black">Job applications</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#71837A]">Candidate, job, location aur current stage ke basis par applications filter karein. Har application ki complete history dekhkar process aage badhayein.</p></div><span className="inline-flex items-center gap-2 rounded-lg bg-[#35231C] px-4 py-3 text-sm font-bold text-white"><ClipboardCheck size={17} />{loading ? "Loading..." : `${filteredApplications.length} of ${applications.length}`}</span></div>

        {message && <Notice tone="success" text={message} onClose={() => setMessage(undefined)} />}
        {error && <Notice tone="error" text={error} onClose={() => setError(undefined)} />}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="All applications" value={counts.total} icon={ClipboardCheck} color="bg-[#EAF1FF] text-[#3D69BE]" />
          <Metric label="Needs review" value={counts.review} icon={UserRound} color="bg-[#FFF0E7] text-[#C9471E]" />
          <Metric label="Shortlisted" value={counts.shortlisted} icon={UsersRound} color="bg-[#F6ECFF] text-[#7F4BB0]" />
          <Metric label="Interview stage" value={counts.interviews} icon={CalendarClock} color="bg-[#FFF7D9] text-[#8A6810]" />
          <Metric label="Selected / joined" value={counts.selected} icon={CheckCircle2} color="bg-[#E8F5ED] text-[#258653]" />
        </section>

        <section className="mt-6 rounded-xl border border-[#E0E8E2] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_220px_220px]">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E7E2] px-3 focus-within:border-[#E95D2B] focus-within:ring-2 focus-within:ring-[#FFE1D1]"><Search size={18} className="text-[#E95D2B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Candidate, mobile, Job ID, title, company ya application ID" className="min-w-0 flex-1 text-sm outline-none" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value as "ALL" | ApplicationStatus)} className="admin-input"><option value="ALL">All stages</option>{statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
            <select value={vertical} onChange={(event) => setVertical(event.target.value as "ALL" | BusinessVertical)} className="admin-input"><option value="ALL">All business fields</option>{BUSINESS_VERTICALS.map((item) => <option key={item} value={item}>{BUSINESS_VERTICAL_LABELS[item]}</option>)}</select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_180px_auto]">
            <select value={jobId} onChange={(event) => setJobId(event.target.value)} className="admin-input"><option value="ALL">All jobs</option>{jobOptions.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.company}</option>)}</select>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="admin-input"><option value="ALL">All cities</option>{cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#71837A]">Applied from<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="admin-input" /></label>
            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#71837A]">Applied to<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="admin-input" /></label>
            <button type="button" disabled={!filtersActive} onClick={clearFilters} className="inline-flex h-11 self-end items-center justify-center gap-2 rounded-lg border border-[#DCE6DF] px-4 text-sm font-bold text-[#52665C] disabled:opacity-40"><FilterX size={16} /> Clear</button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-[#E0E8E2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7EEE9] px-5 py-4"><div><h2 className="font-black">Application records</h2><p className="mt-1 text-xs text-[#71837A]">Status update candidate ke application timeline mein save hota hai.</p></div><span className="rounded-full bg-[#F3F7F4] px-3 py-1.5 text-xs font-bold text-[#65786D]">{filteredApplications.length} matching</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1240px] text-left text-sm"><thead className="bg-[#F7FAF8] text-xs font-bold text-[#71837A]"><tr><th className="px-5 py-3">APPLICATION</th><th>CANDIDATE</th><th>JOB</th><th>FIELD / LOCATION</th><th>APPLIED</th><th>STATUS</th><th className="px-5">ACTION</th></tr></thead><tbody>{filteredApplications.map((application) => {
            const jobVertical = application.job ? application.job.businessVertical ?? inferBusinessVertical(application.job.category) : undefined;
            const busy = updatingId === application.id;
            return <tr key={application.id} className="border-t border-[#EDF1EE] align-top hover:bg-[#FCFDFC]">
              <td className="px-5 py-4"><p className="font-black">{application.id}</p><p className="mt-1 text-[11px] text-[#8A9991]">Candidate: {application.candidateId}</p><p className="mt-1 text-[11px] text-[#8A9991]">Job: {application.jobId}</p></td>
              <td className="py-4"><p className="font-black">{application.candidate?.fullName ?? "Candidate unavailable"}</p><p className="mt-1 text-xs text-[#71837A]">{application.candidate?.mobile ?? "No mobile"}</p><p className="mt-1 text-xs text-[#71837A]">{application.candidate?.email ?? "Email not added"}</p></td>
              <td className="py-4"><p className="font-black">{application.job?.title ?? "Job unavailable"}</p><p className="mt-1 text-xs text-[#71837A]">{application.job?.company}</p><p className="mt-1 text-[11px] text-[#8A9991]">{application.job?.category}</p></td>
              <td className="py-4">{jobVertical && <BusinessBadge vertical={jobVertical} />}<p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#52665C]"><MapPin size={13} className="text-[#E95D2B]" />{application.job?.city ?? application.candidate?.city ?? "Location pending"}</p></td>
              <td className="py-4"><p className="font-semibold">{formatDate(application.appliedAt)}</p><p className="mt-1 text-xs text-[#71837A]">{formatTime(application.appliedAt)}</p></td>
              <td className="py-4"><StatusBadge status={application.status} /></td>
              <td className="px-5 py-4"><div className="flex items-center gap-2"><select disabled={busy} value={application.status} onChange={(event) => void update(application, event.target.value as ApplicationStatus)} aria-label={`Update ${application.id} status`} className="h-9 rounded-md border border-[#DCE6DF] bg-white px-2 text-xs font-black disabled:opacity-50">{statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><button type="button" disabled={busy} onClick={() => setSelectedId(application.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#35231C] px-3 text-xs font-black text-white disabled:opacity-50">Details <ChevronRight size={14} /></button></div></td>
            </tr>;
          })}{!loading && !filteredApplications.length && <tr><td colSpan={7} className="px-5 py-16 text-center"><ClipboardCheck size={30} className="mx-auto text-[#B4C0BA]" /><p className="mt-3 font-bold text-[#52665C]">Koi matching application nahi mili</p><p className="mt-1 text-xs text-[#8A9991]">Filters clear karein ya date range badlein.</p></td></tr>}</tbody></table></div>
        </section>
      </div>

      {selected && <ApplicationDrawer application={selected} busy={updatingId === selected.id} message={message} error={error} onClose={() => setSelectedId(undefined)} onUpdate={update} onDismissMessage={() => setMessage(undefined)} onDismissError={() => setError(undefined)} />}
    </main>
  );
}

function ApplicationDrawer({ application, busy, message, error, onClose, onUpdate, onDismissMessage, onDismissError }: { application: AdminApplication; busy: boolean; message?: string; error?: string; onClose: () => void; onUpdate: (application: AdminApplication, status: ApplicationStatus) => Promise<void>; onDismissMessage: () => void; onDismissError: () => void }) {
  const { candidate, job } = application;
  const jobVertical = job ? job.businessVertical ?? inferBusinessVertical(job.category) : undefined;
  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} className="fixed inset-0 z-50 flex justify-end bg-[#18221D]/65 backdrop-blur-sm"><aside role="dialog" aria-modal="true" aria-labelledby="application-detail-title" className="flex h-full w-full max-w-3xl flex-col bg-[#F5F7F5] shadow-2xl">
    <header className="flex items-start justify-between gap-4 border-b border-[#DFE8E1] bg-white px-5 py-4 sm:px-7"><div><p className="text-xs font-black tracking-[.1em] text-[#E95D2B]">APPLICATION DETAILS</p><h2 id="application-detail-title" className="mt-1 text-2xl font-black">{candidate?.fullName ?? "Candidate application"}</h2><p className="mt-1 text-xs text-[#71837A]">{application.id} · Applied {formatDate(application.appliedAt)}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close application details" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F7F4] text-[#52665C] disabled:opacity-50"><X size={19} /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
      {message && <Notice tone="success" text={message} onClose={onDismissMessage} compact />}{error && <Notice tone="error" text={error} onClose={onDismissError} compact />}
      <section className="rounded-xl bg-[#35231C] p-5 text-white"><p className="text-xs font-bold tracking-[.1em] text-[#FFCF68]">CURRENT PROCESS STAGE</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><div><StatusBadge status={application.status} dark /><p className="mt-3 max-w-md text-xs leading-5 text-[#DFCFC6]">Status change hote hi candidate ki timeline update hogi. Shortlist ke baad interview schedule karein.</p></div><select disabled={busy} value={application.status} onChange={(event) => void onUpdate(application, event.target.value as ApplicationStatus)} className="h-11 min-w-52 rounded-lg border border-white/15 bg-white px-3 text-sm font-black text-[#25372E] disabled:opacity-50">{statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></div>{application.status === "SHORTLISTED" && <a href="/admin/interviews" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E95D2B] px-4 py-2.5 text-sm font-black text-white">Schedule interview <ChevronRight size={15} /></a>}</section>

      <section className="mt-5 rounded-xl border border-[#E0E8E2] bg-white p-5"><Title icon={UserRound} title="Candidate snapshot" subtitle="Contact, profile readiness aur verification" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Full name" value={candidate?.fullName} /><Info label="Mobile" value={candidate?.mobile} /><Info label="Email" value={candidate?.email} /><Info label="Candidate ID" value={candidate?.id ?? application.candidateId} /><Info label="City" value={candidate?.city} /><Info label="Preferred role" value={candidate?.preferredRole} /><Info label="Verification" value={candidate?.verificationStatus ? formatLabel(candidate.verificationStatus) : undefined} /><Info label="Availability" value={candidate?.availability ? formatLabel(candidate.availability) : undefined} /><Info label="Profile completion" value={candidate?.profileCompletion === undefined ? undefined : `${candidate.profileCompletion}%`} /></div><a href="/admin/candidates" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#C9471E]">Open candidate pool <ChevronRight size={14} /></a></section>

      <section className="mt-5 rounded-xl border border-[#E0E8E2] bg-white p-5"><Title icon={BriefcaseBusiness} title="Applied job" subtitle="Vacancy aur employer details" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Job title" value={job?.title} /><Info label="Company" value={job?.company} /><Info label="Job ID" value={job?.id ?? application.jobId} /><Info label="Category" value={job?.category} /><Info label="Business field" value={jobVertical ? BUSINESS_VERTICAL_LABELS[jobVertical] : undefined} /><Info label="Location" value={job ? `${job.city}, ${job.district}` : undefined} /><Info label="Salary" value={job ? `₹${money.format(job.salaryMin)} – ₹${money.format(job.salaryMax)}` : undefined} /><Info label="Vacancies" value={job ? String(job.vacancies) : undefined} /><Info label="Employment" value={job?.employmentType ? formatLabel(job.employmentType) : undefined} /><Info label="Shift" value={job?.shift ? formatLabel(job.shift) : undefined} /><Info label="Qualification" value={job?.qualification} /><Info label="Deadline" value={job?.applicationDeadline ? formatDate(job.applicationDeadline) : undefined} /></div>{job && <a href={`/jobs/${job.id}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#157A4A]">Open public job <ExternalLink size={14} /></a>}</section>

      <section className="mt-5 rounded-xl border border-[#E0E8E2] bg-white p-5"><Title icon={ClipboardCheck} title="Application timeline" subtitle={`${application.statusHistory.length} recorded stage changes`} /><div className="relative mt-5 grid gap-0 pl-5 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-[#DCE6DF]">{application.statusHistory.map((history, index) => <div key={`${history.status}-${history.at}-${index}`} className="relative pb-5 last:pb-0"><span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${index === application.statusHistory.length - 1 ? "bg-[#E95D2B]" : "bg-[#9BB0A4]"}`} /><p className="text-sm font-black">{formatLabel(history.status)}</p><p className="mt-1 text-xs text-[#71837A]">{new Date(history.at).toLocaleString("en-IN")}</p></div>)}</div></section>
    </div>
  </aside></div>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof ClipboardCheck; color: string }) { return <article className="rounded-xl border border-[#E0E8E2] bg-white p-5"><div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon size={19} /></span><span className="text-3xl font-black">{value}</span></div><p className="mt-4 text-sm font-bold text-[#65786D]">{label}</p></article>; }
function BusinessBadge({ vertical }: { vertical: BusinessVertical }) { const styles: Record<BusinessVertical, string> = { RECRUITMENT: "bg-[#EAF1FF] text-[#3D69BE]", SECURITY: "bg-[#FFF0E7] text-[#C9471E]", BABY_CARE: "bg-[#F6ECFF] text-[#7F4BB0]", HOUSEKEEPING: "bg-[#E8F5ED] text-[#258653]", PEST_CONTROL: "bg-[#FFF7D9] text-[#8A6810]" }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[vertical]}`}>{BUSINESS_VERTICAL_LABELS[vertical]}</span>; }
function StatusBadge({ status, dark = false }: { status: ApplicationStatus; dark?: boolean }) { const style = dark ? "bg-white/15 text-white" : status === "JOINED" || status === "SELECTED" ? "bg-[#E8F5ED] text-[#258653]" : status === "REJECTED" || status === "WITHDRAWN" ? "bg-[#FDECEC] text-[#B43C3C]" : status === "SHORTLISTED" || status === "INTERVIEW_SCHEDULED" || status === "INTERVIEWED" ? "bg-[#F6ECFF] text-[#7F4BB0]" : status === "UNDER_REVIEW" ? "bg-[#FFF7D9] text-[#8A6810]" : "bg-[#EAF1FF] text-[#3D69BE]"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${style}`}>{formatLabel(status)}</span>; }
function Title({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) { return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E7] text-[#E95D2B]"><Icon size={19} /></span><div><h3 className="font-black">{title}</h3><p className="mt-0.5 text-xs text-[#71837A]">{subtitle}</p></div></div>; }
function Info({ label, value }: { label: string; value?: string | null }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9991]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#35483E]">{value || "Not available"}</p></div>; }
function Notice({ tone, text, onClose, compact = false }: { tone: "success" | "error"; text: string; onClose: () => void; compact?: boolean }) { return <div className={`${compact ? "mb-5" : "mt-5"} flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-[#E8F5ED] text-[#258653]" : "bg-[#FFF0E7] text-[#C9471E]"}`}><span>{text}</span><button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button></div>; }
function formatLabel(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
