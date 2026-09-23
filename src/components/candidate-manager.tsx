"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, ChevronRight, Download, FileCheck2, FileText, GraduationCap, MapPin, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from "lucide-react";
import type { AdminCandidateDetails, Application, ApplicationStatus, Candidate, CandidateDocument, CandidateDocumentType, Interview, Job } from "@/lib/portal";

const verificationStatuses: Candidate["verificationStatus"][] = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "BLOCKED"];
const availabilityStatuses: NonNullable<Candidate["availability"]>[] = ["AVAILABLE", "INTERVIEWING", "SELECTED", "WORKING", "NOT_AVAILABLE"];
const applicationStatuses: ApplicationStatus[] = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "JOINING_SCHEDULED", "JOINED", "REJECTED", "WITHDRAWN"];
const interviewStatuses: Interview["status"][] = ["SCHEDULED", "RESCHEDULED", "COMPLETED", "SELECTED", "REJECTED", "NO_SHOW", "CANCELLED"];
const expectedDocuments: Array<{ type: CandidateDocumentType; label: string; sensitive?: boolean }> = [
  { type: "PHOTO", label: "Passport photo" },
  { type: "RESUME", label: "Resume" },
  { type: "AADHAAR_FRONT", label: "Aadhaar front", sensitive: true },
  { type: "AADHAAR_BACK", label: "Aadhaar back", sensitive: true },
  { type: "PAN", label: "PAN card", sensitive: true },
  { type: "POLICE_VERIFICATION", label: "Police verification", sensitive: true },
  { type: "EDUCATION_CERTIFICATE", label: "Education certificate" },
  { type: "EXPERIENCE_CERTIFICATE", label: "Experience certificate" },
  { type: "OTHER", label: "Other document" },
];

type CandidateApplication = Application & { job?: Job };
type CandidateInterview = Interview & { job?: Job };

export function CandidateManager({ canDelete = false }: { canDelete?: boolean }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [details, setDetails] = useState<AdminCandidateDetails>();
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (verificationFilter) params.set("verificationStatus", verificationFilter);
    if (availabilityFilter) params.set("availability", availabilityFilter);
    try {
      const response = await fetch(`/api/admin/candidates?${params.toString()}`);
      const result = await response.json() as { data?: Candidate[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Candidates load nahi ho sake.");
      setCandidates(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Candidates load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, [availabilityFilter, query, verificationFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCandidates(); }, 250);
    return () => window.clearTimeout(timer);
  }, [loadCandidates]);

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busyAction) setSelectedId(undefined); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", close); };
  }, [busyAction, selectedId]);

  const counts = useMemo(() => ({
    total: candidates.length,
    review: candidates.filter((candidate) => candidate.verificationStatus === "PENDING" || candidate.verificationStatus === "UNDER_REVIEW").length,
    verified: candidates.filter((candidate) => candidate.verificationStatus === "VERIFIED").length,
    active: candidates.filter((candidate) => ["AVAILABLE", "INTERVIEWING", "SELECTED"].includes(candidate.availability ?? "AVAILABLE")).length,
  }), [candidates]);

  async function loadDetails(candidateId: string) {
    setDetailsLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}`);
      const result = await response.json() as { data?: AdminCandidateDetails; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Candidate profile load nahi hua.");
      setDetails(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Candidate profile load nahi hua.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function openCandidate(candidateId: string) {
    setSelectedId(candidateId);
    setDetails(undefined);
    void loadDetails(candidateId);
  }

  async function updateCandidate(candidate: Candidate, verificationStatus: Candidate["verificationStatus"], availability = candidate.availability ?? "AVAILABLE", blockReason?: string, adminNotes?: string) {
    setBusyAction("candidate-status");
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationStatus, availability, blockReason, adminNotes }) });
      const result = await response.json() as { data?: Candidate; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Candidate update nahi ho saka.");
      setCandidates((current) => current.map((item) => item.id === candidate.id ? result.data! : item));
      setDetails((current) => current ? { ...current, candidate: result.data! } : current);
      setMessage(`${candidate.fullName} ka process update ho gaya.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Candidate update nahi ho saka.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function deleteCandidate(candidate: Candidate, reason: string) {
    setBusyAction("candidate-delete"); setError(undefined);
    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: candidate.id, reason }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Candidate delete nahi hua.");
      setCandidates((current) => current.filter((item) => item.id !== candidate.id)); setSelectedId(undefined); setDetails(undefined); setMessage(result.message);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Candidate delete nahi hua."); }
    finally { setBusyAction(undefined); }
  }

  async function updateDocument(type: CandidateDocumentType, status: CandidateDocument["status"], rejectionReason?: string) {
    if (!selectedId) return;
    setBusyAction(`document:${type}`);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/candidates/${selectedId}/documents/${type}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, rejectionReason }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Document update nahi hua.");
      await loadDetails(selectedId);
      setMessage(`${documentLabel(type)} ka status update ho gaya.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Document update nahi hua.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function viewDocument(type: CandidateDocumentType) {
    if (!selectedId) return;
    setBusyAction(`view:${type}`);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/candidates/${selectedId}/documents/${type}/download`, { method: "POST" });
      const result = await response.json() as { data?: { url: string }; error?: string };
      if (!response.ok || !result.data?.url) throw new Error(result.error ?? "Document open nahi hua.");
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Document open nahi hua.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function updateApplication(application: CandidateApplication, status: ApplicationStatus) {
    if (!selectedId || application.status === status) return;
    setBusyAction(`application:${application.id}`);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Application process update nahi hua.");
      await loadDetails(selectedId);
      setMessage(`${application.job?.title ?? "Application"} ko ${formatLabel(status)} stage par move kiya gaya.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Application process update nahi hua.");
    } finally {
      setBusyAction(undefined);
    }
  }

  async function updateInterview(interview: CandidateInterview, status: Interview["status"]) {
    if (!selectedId || interview.status === status) return;
    setBusyAction(`interview:${interview.id}`);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/interviews/${interview.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Interview status update nahi hua.");
      await loadDetails(selectedId);
      setMessage(`Interview ${formatLabel(status)} mark ho gaya.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Interview status update nahi hua.");
    } finally {
      setBusyAction(undefined);
    }
  }

  function clearFilters() {
    setQuery("");
    setVerificationFilter("");
    setAvailabilityFilter("");
  }

  const filtersActive = Boolean(query || verificationFilter || availabilityFilter);

  return (
    <main className="min-h-screen bg-[#F5F7F5] text-[#25372E]">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="section-kicker text-[#E95D2B]">CANDIDATE OPERATIONS</p><h1 className="mt-2 text-3xl font-black">Candidate pool</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#71837A]">Profile, documents, verification, applications aur interview progress ko ek hi workspace se review aur manage karein.</p></div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#35231C] px-4 py-3 text-sm font-bold text-white"><UsersRound size={17} /> {loading ? "Loading..." : `${candidates.length} candidates`}</span>
        </div>

        {message && <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]"><span>{message}</span><button type="button" onClick={() => setMessage(undefined)} aria-label="Dismiss message"><X size={16} /></button></div>}
        {error && <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]"><span>{error}</span><button type="button" onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={16} /></button></div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Visible candidates" value={counts.total} icon={UsersRound} color="bg-[#EAF1FF] text-[#3D69BE]" />
          <Metric label="Needs review" value={counts.review} icon={FileText} color="bg-[#FFF0E7] text-[#C9471E]" />
          <Metric label="Verified" value={counts.verified} icon={ShieldCheck} color="bg-[#E8F5ED] text-[#258653]" />
          <Metric label="Active pipeline" value={counts.active} icon={BriefcaseBusiness} color="bg-[#F6ECFF] text-[#7F4BB0]" />
        </section>

        <section className="mt-6 rounded-xl border border-[#E0E8E2] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E7E2] px-3 focus-within:border-[#E95D2B] focus-within:ring-2 focus-within:ring-[#FFE1D1]"><Search size={18} className="text-[#E95D2B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, mobile, email, ID, city ya role" className="min-w-0 flex-1 text-sm outline-none" /></label>
            <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="admin-input"><option value="">All verification states</option>{verificationStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="admin-input"><option value="">All availability states</option>{availabilityStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
            {filtersActive ? <button type="button" onClick={clearFilters} className="h-11 rounded-lg border border-[#DCE6DF] px-4 text-sm font-bold text-[#52665C]">Clear filters</button> : <span className="inline-flex h-11 items-center justify-center rounded-lg bg-[#F3F7F4] px-4 text-sm font-bold text-[#65786D]">Live records</span>}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-[#E0E8E2] bg-white">
          <div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="bg-[#F7FAF8] text-xs font-bold text-[#71837A]"><tr><th className="px-5 py-3">CANDIDATE</th><th>CONTACT</th><th>LOCATION / ROLE</th><th>PROFILE</th><th>VERIFICATION</th><th>AVAILABILITY</th><th>REGISTERED</th><th className="px-5">ACTION</th></tr></thead>
            <tbody>{candidates.map((candidate) => <tr key={candidate.id} className="border-t border-[#EDF1EE] hover:bg-[#FCFDFC]">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E8F5ED] font-black text-[#258653]">{candidate.fullName.charAt(0).toUpperCase()}</span><div><p className="font-black">{candidate.fullName}</p><p className="mt-1 text-xs font-semibold text-[#8A9991]">{candidate.id}</p></div></div></td>
              <td><p className="font-semibold">{candidate.mobile}</p><p className="mt-1 text-xs text-[#71837A]">{candidate.email || "Email not added"}</p></td>
              <td><p>{candidate.city ?? "Location pending"}</p><p className="mt-1 text-xs text-[#71837A]">{candidate.preferredRole ?? "Role preference pending"}</p></td>
              <td><ProfileProgress value={candidate.profileCompletion ?? 25} /></td>
              <td><VerificationBadge status={candidate.verificationStatus} /></td>
              <td><span className="text-xs font-bold text-[#52665C]">{formatLabel(candidate.availability ?? "AVAILABLE")}</span></td>
              <td><p className="font-semibold">{formatDate(candidate.createdAt)}</p><p className="mt-1 text-xs text-[#71837A]">{candidate.experienceType ? formatLabel(candidate.experienceType) : "Experience pending"}</p></td>
              <td className="px-5"><button type="button" onClick={() => openCandidate(candidate.id)} className="inline-flex items-center gap-2 rounded-lg bg-[#35231C] px-3 py-2 text-xs font-black text-white">View &amp; manage <ChevronRight size={14} /></button></td>
            </tr>)}{!loading && !candidates.length && <tr><td colSpan={8} className="px-5 py-16 text-center"><UserRound size={30} className="mx-auto text-[#B4C0BA]" /><p className="mt-3 font-bold text-[#52665C]">Koi matching candidate nahi mila</p><p className="mt-1 text-xs text-[#8A9991]">Filters clear karke dobara dekhein.</p></td></tr>}</tbody>
          </table></div>
        </section>
      </div>

      {selectedId && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyAction) setSelectedId(undefined); }} className="fixed inset-0 z-50 flex justify-end bg-[#18221D]/65 backdrop-blur-sm">
        <aside role="dialog" aria-modal="true" aria-labelledby="candidate-detail-title" className="flex h-full w-full max-w-4xl flex-col bg-[#F5F7F5] shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-[#DFE8E1] bg-white px-5 py-4 sm:px-7">
            <div><p className="text-xs font-black tracking-[.1em] text-[#E95D2B]">CANDIDATE PROFILE</p><h2 id="candidate-detail-title" className="mt-1 text-2xl font-black">{details?.candidate.fullName ?? "Loading candidate..."}</h2><p className="mt-1 text-xs text-[#71837A]">{details?.candidate.id ?? selectedId}</p></div>
            <button type="button" disabled={Boolean(busyAction)} onClick={() => setSelectedId(undefined)} aria-label="Close candidate details" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F7F4] text-[#52665C] disabled:opacity-50"><X size={19} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {message && <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]"><span>{message}</span><button type="button" onClick={() => setMessage(undefined)} aria-label="Dismiss message"><X size={16} /></button></div>}
            {error && <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]"><span>{error}</span><button type="button" onClick={() => setError(undefined)} aria-label="Dismiss error"><X size={16} /></button></div>}
            {detailsLoading || !details ? <div className="grid min-h-64 place-items-center text-sm font-bold text-[#71837A]">Complete profile load ho raha hai...</div> : <CandidateDetailsPanel
              details={details}
              busyAction={busyAction}
              onCandidateUpdate={updateCandidate}
              onDocumentUpdate={updateDocument}
              onViewDocument={viewDocument}
              onApplicationUpdate={updateApplication}
              onInterviewUpdate={updateInterview}
              canDelete={canDelete}
              onDelete={deleteCandidate}
            />}
          </div>
        </aside>
      </div>}
    </main>
  );
}

function CandidateDetailsPanel({ details, busyAction, onCandidateUpdate, onDocumentUpdate, onViewDocument, onApplicationUpdate, onInterviewUpdate, canDelete, onDelete }: {
  details: AdminCandidateDetails;
  busyAction?: string;
  onCandidateUpdate: (candidate: Candidate, verification: Candidate["verificationStatus"], availability?: Candidate["availability"], blockReason?: string, adminNotes?: string) => Promise<void>;
  onDocumentUpdate: (type: CandidateDocumentType, status: CandidateDocument["status"], reason?: string) => Promise<void>;
  onViewDocument: (type: CandidateDocumentType) => Promise<void>;
  onApplicationUpdate: (application: CandidateApplication, status: ApplicationStatus) => Promise<void>;
  onInterviewUpdate: (interview: CandidateInterview, status: Interview["status"]) => Promise<void>;
  canDelete: boolean;
  onDelete: (candidate: Candidate, reason: string) => Promise<void>;
}) {
  const { candidate, education, experience, documents, applications, interviews } = details;
  return <div className="grid gap-5">
    <CandidateControls candidate={candidate} busy={busyAction === "candidate-status" || busyAction === "candidate-delete"} canDelete={canDelete} onUpdate={onCandidateUpdate} onDelete={onDelete} />

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={UserRound} title="Personal and contact information" subtitle="Registration aur current profile data" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Full name" value={candidate.fullName} /><Info label="Mobile" value={candidate.mobile} /><Info label="Email" value={candidate.email} /><Info label="Candidate ID" value={candidate.id} /><Info label="Registration" value={formatDate(candidate.createdAt)} /><Info label="Last updated" value={candidate.updatedAt ? formatDate(candidate.updatedAt) : undefined} /></div></section>

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={MapPin} title="Address and job preference" subtitle="Candidate kahan available hai aur kis role mein interested hai" /><div className="mt-5 grid gap-4 md:grid-cols-2"><InfoGroup title="Current address"><Info label="Address" value={candidate.currentAddress?.line1} /><Info label="City / district" value={joinValues(candidate.currentAddress?.city ?? candidate.city, candidate.currentAddress?.district)} /><Info label="State / pincode" value={joinValues(candidate.currentAddress?.state, candidate.currentAddress?.pincode)} /></InfoGroup><InfoGroup title="Permanent address"><Info label="Address" value={candidate.permanentAddress?.line1} /><Info label="City / district" value={joinValues(candidate.permanentAddress?.city, candidate.permanentAddress?.district)} /><Info label="State / pincode" value={joinValues(candidate.permanentAddress?.state, candidate.permanentAddress?.pincode)} /></InfoGroup></div><div className="mt-4 grid gap-3 rounded-lg bg-[#F7FAF8] p-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Preferred category" value={candidate.jobPreference?.category} /><Info label="Preferred role" value={candidate.jobPreference?.role ?? candidate.preferredRole} /><Info label="Preferred location" value={candidate.jobPreference?.location} /><Info label="Expected salary" value={salaryRange(candidate.jobPreference?.expectedSalaryMin, candidate.jobPreference?.expectedSalaryMax)} /><Info label="Job type" value={candidate.jobPreference?.jobType ? formatLabel(candidate.jobPreference.jobType) : undefined} /><Info label="Shift" value={candidate.jobPreference?.shift ? formatLabel(candidate.jobPreference.shift) : undefined} /><Info label="Immediate joining" value={candidate.jobPreference?.immediateJoining === undefined ? undefined : candidate.jobPreference.immediateJoining ? "Yes" : "No"} /></div></section>

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={GraduationCap} title="Education and experience" subtitle="Qualification aur previous work details" /><div className="mt-5 grid gap-4 md:grid-cols-2"><InfoGroup title="Education"><Info label="Qualification" value={education?.qualification ?? candidate.highestQualification} /><Info label="Course / specialization" value={joinValues(education?.course, education?.specialization)} /><Info label="Institution" value={education?.institution} /><Info label="Passing year / score" value={joinValues(education?.passingYear, education?.percentage)} /></InfoGroup><InfoGroup title="Experience"><Info label="Experience type" value={candidate.experienceType ? formatLabel(candidate.experienceType) : undefined} /><Info label="Total experience" value={candidate.totalExperienceYears === undefined ? undefined : `${candidate.totalExperienceYears} years`} /><Info label="Company / role" value={joinValues(experience?.company, experience?.jobRole)} /><Info label="Previous salary" value={experience?.salary} /><Info label="Duration" value={joinValues(experience?.startDate, experience?.endDate)} /><Info label="Responsibilities" value={experience?.responsibilities} /></InfoGroup></div></section>

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={FileCheck2} title="Documents and verification" subtitle={`${documents.length} of ${expectedDocuments.length} document types uploaded`} /><div className="mt-5 grid gap-3 md:grid-cols-2">{expectedDocuments.map((expected) => { const document = documents.find((item) => item.type === expected.type); return <DocumentCard key={`${expected.type}:${document?.status}:${document?.rejectionReason ?? ""}`} expected={expected} document={document} busy={busyAction === `document:${expected.type}` || busyAction === `view:${expected.type}`} onUpdate={onDocumentUpdate} onView={onViewDocument} />; })}</div></section>

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={BriefcaseBusiness} title="Applications and recruitment process" subtitle={`${applications.length} applications linked to this candidate`} /><div className="mt-5 grid gap-3">{applications.length ? applications.map((application) => <ApplicationCard key={application.id} application={application} busy={busyAction === `application:${application.id}`} onUpdate={onApplicationUpdate} />) : <EmptyState text="Candidate ne abhi kisi job ke liye apply nahi kiya hai." />}</div></section>

    <section className="rounded-xl border border-[#E0E8E2] bg-white p-5"><SectionTitle icon={CheckCircle2} title="Interview history" subtitle={`${interviews.length} interview records`} /><div className="mt-5 grid gap-3">{interviews.length ? interviews.map((interview) => <InterviewCard key={interview.id} interview={interview} busy={busyAction === `interview:${interview.id}`} onUpdate={onInterviewUpdate} />) : <EmptyState text="Abhi koi interview schedule nahi hua hai." />}</div></section>
  </div>;
}

function CandidateControls({ candidate, busy, canDelete, onUpdate, onDelete }: { candidate: Candidate; busy: boolean; canDelete: boolean; onUpdate: (candidate: Candidate, verification: Candidate["verificationStatus"], availability?: Candidate["availability"], blockReason?: string, adminNotes?: string) => Promise<void>; onDelete: (candidate: Candidate, reason: string) => Promise<void> }) {
  const [verification, setVerification] = useState(candidate.verificationStatus); const [availability, setAvailability] = useState(candidate.availability ?? "AVAILABLE"); const [blockReason, setBlockReason] = useState(candidate.blockReason ?? ""); const [notes, setNotes] = useState(candidate.adminNotes ?? "");
  return <section className="rounded-xl bg-[#35231C] p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.1em] text-[#FFCF68]">PROCESS CONTROL</p><h3 className="mt-1 text-xl font-black">Verification, block reason and notes</h3></div><div className="min-w-36 rounded-lg bg-white/10 p-3 text-center"><p className="text-2xl font-black">{candidate.profileCompletion ?? 25}%</p><p className="text-[10px] font-bold uppercase tracking-wide text-[#DFCFC6]">Profile complete</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold text-[#F1E4DD]">Verification status<select disabled={busy} value={verification} onChange={(event) => setVerification(event.target.value as Candidate["verificationStatus"])} className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-[#25372E]">{verificationStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label><label className="grid gap-2 text-xs font-bold text-[#F1E4DD]">Availability<select disabled={busy} value={availability} onChange={(event) => setAvailability(event.target.value as NonNullable<Candidate["availability"]>)} className="h-11 rounded-lg bg-white px-3 text-sm font-bold text-[#25372E]">{availabilityStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>{verification === "BLOCKED" && <label className="grid gap-2 text-xs font-bold text-[#F1E4DD] sm:col-span-2">Block reason<input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} maxLength={500} className="admin-input text-[#25372E]" placeholder="Required reason" /></label>}<label className="grid gap-2 text-xs font-bold text-[#F1E4DD] sm:col-span-2">Internal admin notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="admin-input min-h-24 py-3 text-[#25372E]" /></label></div><div className="mt-4 flex flex-wrap gap-3"><button disabled={busy || (verification === "BLOCKED" && !blockReason.trim())} onClick={() => void onUpdate(candidate, verification, availability, blockReason, notes)} className="rounded-lg bg-[#157A4A] px-4 py-2.5 text-sm font-black disabled:opacity-50">Save candidate controls</button>{canDelete && <button disabled={busy} onClick={() => { const reason = window.prompt(`Deletion reason likhein. Candidate ${candidate.id} permanently delete hoga.`); if (reason?.trim() && window.confirm(`${candidate.id} ka personal data permanently delete karein?`)) void onDelete(candidate, reason.trim()); }} className="inline-flex items-center gap-2 rounded-lg bg-[#B43C3C] px-4 py-2.5 text-sm font-black disabled:opacity-50"><Trash2 size={15} />Delete account</button>}</div></section>;
}

function DocumentCard({ expected, document, busy, onUpdate, onView }: { expected: { type: CandidateDocumentType; label: string; sensitive?: boolean }; document?: Omit<CandidateDocument, "storageKey">; busy: boolean; onUpdate: (type: CandidateDocumentType, status: CandidateDocument["status"], reason?: string) => Promise<void>; onView: (type: CandidateDocumentType) => Promise<void> }) {
  const [status, setStatus] = useState<CandidateDocument["status"]>(document?.status ?? "PENDING");
  const [reason, setReason] = useState(document?.rejectionReason ?? "");
  return <article className={`rounded-lg border p-4 ${document ? "border-[#DCE6DF]" : "border-dashed border-[#D5E1DA] bg-[#FAFCFB]"}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="font-black">{expected.label}</p><p className="mt-1 text-xs text-[#71837A]">{document ? `Uploaded ${formatDate(document.createdAt)}` : "Not uploaded"}</p></div>{document ? <DocumentStatus status={document.status} /> : <span className="rounded-full bg-[#EEF1EF] px-2 py-1 text-[10px] font-black text-[#71837A]">MISSING</span>}</div>
    {expected.sensitive && document && <p className="mt-3 rounded-md bg-[#FFF7E3] px-3 py-2 text-[11px] font-semibold text-[#705715]">Sensitive identity document — sirf verification purpose ke liye open karein.</p>}
    {document && <><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><select disabled={busy} value={status} onChange={(event) => setStatus(event.target.value as CandidateDocument["status"])} className="h-10 rounded-md border border-[#DCE6DF] bg-white px-2 text-xs font-bold"><option value="PENDING">Pending review</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select><button type="button" disabled={busy} onClick={() => void onView(expected.type)} className="inline-flex items-center gap-1.5 rounded-md border border-[#157A4A] px-3 text-xs font-black text-[#157A4A] disabled:opacity-50"><Download size={14} /> View</button></div>{status === "REJECTED" && <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason likhein" className="admin-input mt-2" />}<button type="button" disabled={busy || (status === document.status && reason === (document.rejectionReason ?? "")) || (status === "REJECTED" && !reason.trim())} onClick={() => void onUpdate(expected.type, status, reason)} className="mt-3 rounded-md bg-[#35231C] px-3 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? "Updating..." : "Save document status"}</button></>}
  </article>;
}

function ApplicationCard({ application, busy, onUpdate }: { application: CandidateApplication; busy: boolean; onUpdate: (application: CandidateApplication, status: ApplicationStatus) => Promise<void> }) {
  return <article className="rounded-lg bg-[#F7FAF8] p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black">{application.job?.title ?? application.jobId}</p><p className="mt-1 text-xs text-[#71837A]">{application.job?.company ?? "Employer"} · Applied {formatDate(application.appliedAt)}</p><p className="mt-1 text-[11px] font-semibold text-[#8A9991]">{application.id}</p></div><select disabled={busy} value={application.status} onChange={(event) => void onUpdate(application, event.target.value as ApplicationStatus)} className="h-10 rounded-md border border-[#DCE6DF] bg-white px-3 text-xs font-black disabled:opacity-50">{applicationStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></div><div className="mt-3 flex flex-wrap gap-2">{application.statusHistory.slice(-4).map((history, index) => <span key={`${history.status}-${history.at}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#65786D]">{formatLabel(history.status)} · {formatDate(history.at)}</span>)}</div>{application.status === "SHORTLISTED" && <a href="/admin/interviews" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#C9471E]">Schedule interview <ChevronRight size={14} /></a>}</article>;
}

function InterviewCard({ interview, busy, onUpdate }: { interview: CandidateInterview; busy: boolean; onUpdate: (interview: CandidateInterview, status: Interview["status"]) => Promise<void> }) {
  return <article className="rounded-lg bg-[#F7FAF8] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{interview.job?.title ?? interview.jobId}</p><p className="mt-1 text-xs text-[#71837A]">{new Date(interview.scheduledAt).toLocaleString("en-IN")} · {formatLabel(interview.mode)}</p></div><select disabled={busy} value={interview.status} onChange={(event) => void onUpdate(interview, event.target.value as Interview["status"])} className="h-9 rounded-md border border-[#DCE6DF] bg-white px-2 text-xs font-black disabled:opacity-50">{interviewStatuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></div>{(interview.address || interview.meetingLink) && <p className="mt-3 text-xs text-[#52665C]">{interview.address || interview.meetingLink}</p>}{interview.instructions && <p className="mt-2 text-xs leading-5 text-[#71837A]">{interview.instructions}</p>}</article>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof UsersRound; color: string }) { return <article className="rounded-xl border border-[#E0E8E2] bg-white p-5"><div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}><Icon size={19} /></span><span className="text-3xl font-black">{value}</span></div><p className="mt-4 text-sm font-bold text-[#65786D]">{label}</p></article>; }
function ProfileProgress({ value }: { value: number }) { return <div className="w-28"><div className="h-2 overflow-hidden rounded-full bg-[#E7EEE9]"><div className="h-full rounded-full bg-[#258653]" style={{ width: `${Math.min(100, value)}%` }} /></div><p className="mt-1 text-xs font-bold text-[#52665C]">{value}% complete</p></div>; }
function VerificationBadge({ status }: { status: Candidate["verificationStatus"] }) { const style = status === "VERIFIED" ? "bg-[#E8F5ED] text-[#258653]" : status === "REJECTED" || status === "BLOCKED" ? "bg-[#FDECEC] text-[#B43C3C]" : status === "UNDER_REVIEW" ? "bg-[#EAF1FF] text-[#3D69BE]" : "bg-[#FFF0E7] text-[#C9471E]"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${style}`}>{formatLabel(status)}</span>; }
function DocumentStatus({ status }: { status: CandidateDocument["status"] }) { const style = status === "VERIFIED" ? "bg-[#E8F5ED] text-[#258653]" : status === "REJECTED" ? "bg-[#FDECEC] text-[#B43C3C]" : "bg-[#FFF7D9] text-[#8A6810]"; return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${style}`}>{formatLabel(status)}</span>; }
function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) { return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E7] text-[#E95D2B]"><Icon size={19} /></span><div><h3 className="font-black">{title}</h3><p className="mt-0.5 text-xs text-[#71837A]">{subtitle}</p></div></div>; }
function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-lg border border-[#E7EEE9] p-4"><p className="mb-3 text-xs font-black uppercase tracking-wide text-[#157A4A]">{title}</p><div className="grid gap-3">{children}</div></div>; }
function Info({ label, value }: { label: string; value?: string | null }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9991]">{label}</p><p className="mt-1 break-words text-sm font-semibold text-[#35483E]">{value || "Not added"}</p></div>; }
function EmptyState({ text }: { text: string }) { return <p className="rounded-lg border border-dashed border-[#D5E1DA] px-4 py-8 text-center text-sm text-[#71837A]">{text}</p>; }
function documentLabel(type: CandidateDocumentType) { return expectedDocuments.find((item) => item.type === type)?.label ?? formatLabel(type); }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatLabel(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }
function joinValues(...values: Array<string | undefined>) { const present = values.filter(Boolean); return present.length ? present.join(" · ") : undefined; }
function salaryRange(min?: number, max?: number) { if (min === undefined && max === undefined) return undefined; const format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }); return `₹${format.format(min ?? 0)} – ₹${format.format(max ?? min ?? 0)}`; }
