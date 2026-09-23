"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Database, Download, FileCheck2, ShieldCheck, Trash2, X } from "lucide-react";
import type { CandidatePrivacyRequest } from "@/lib/portal";

type PrivacySummary = {
  consents?: {
    privacyPolicyVersion: string;
    privacyAcceptedAt: string;
    termsVersion: string;
    termsAcceptedAt: string;
    documentProcessingVersion?: string;
    documentProcessingAcceptedAt?: string;
  };
  retentionReviewAt?: string;
  accountCreatedAt: string;
  latestRequest?: CandidatePrivacyRequest;
  currentVersions: { privacyPolicy: string; terms: string };
};

export function CandidatePrivacyCenter() {
  const [data, setData] = useState<PrivacySummary>();
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/candidate/privacy");
      const result = await response.json() as { data?: PrivacySummary; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Privacy information load nahi hui.");
      setData(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Privacy information load nahi hui.");
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function updateConsent() {
    setSubmitting(true); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch("/api/candidate/privacy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ privacyConsent, termsAccepted }) });
      const result = await response.json() as { data?: PrivacySummary; error?: string; message?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Consent update nahi hua.");
      setData(result.data); setPrivacyConsent(false); setTermsAccepted(false); setMessage(result.message ?? "Consent updated.");
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Consent update nahi hua."); }
    finally { setSubmitting(false); }
  }

  async function requestDeletion() {
    setSubmitting(true); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch("/api/candidate/privacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, confirmation }) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Deletion request submit nahi hui.");
      setMessage(result.message ?? "Deletion request submitted."); setReason(""); setConfirmation(""); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Deletion request submit nahi hui."); }
    finally { setSubmitting(false); }
  }

  async function cancelDeletion() {
    setSubmitting(true); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch("/api/candidate/privacy", { method: "DELETE" });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Request cancel nahi hui.");
      setMessage(result.message ?? "Deletion request cancelled."); await load();
    } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : "Request cancel nahi hui."); }
    finally { setSubmitting(false); }
  }

  const activeRequest = data?.latestRequest && ["SUBMITTED", "IN_REVIEW"].includes(data.latestRequest.status) ? data.latestRequest : undefined;
  const currentConsent = Boolean(data?.consents?.privacyPolicyVersion === data?.currentVersions.privacyPolicy && data?.consents?.termsVersion === data?.currentVersions.terms);

  return <main className="min-h-screen bg-[#EEF5F0] text-[#1F332C]">
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div><p className="section-kicker text-[#157A4A]">PRIVACY CENTRE</p><h1 className="mt-2 text-3xl font-black">Your data and consent</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#5C6B63]">Apne consent records dekhein, personal data ki copy download karein aur account deletion request manage karein.</p></div>
      {message && <Notice tone="success" text={message} onClose={() => setMessage(undefined)} />}{error && <Notice tone="error" text={error} onClose={() => setError(undefined)} />}

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <InfoCard icon={ShieldCheck} title="Privacy consent" value={currentConsent && data?.consents?.privacyAcceptedAt ? `Accepted ${formatDate(data.consents.privacyAcceptedAt)}` : "Consent update pending"} />
        <InfoCard icon={FileCheck2} title="Document consent" value={data?.consents?.documentProcessingAcceptedAt ? `Accepted ${formatDate(data.consents.documentProcessingAcceptedAt)}` : "Accepted before first document upload"} />
        <InfoCard icon={Database} title="Retention review" value={data?.retentionReviewAt ? formatDate(data.retentionReviewAt) : "Reviewed according to active account needs"} />
      </section>

      {data && !currentConsent && <section className="mt-6 rounded-xl border border-[#D8BD70] bg-[#FFFDF5] p-6"><h2 className="text-xl font-black">Update your consent</h2><p className="mt-2 text-sm leading-6 text-[#5C6B63]">Current Privacy Policy aur Terms review karke consent update karein. Ye purane candidate accounts ke liye bhi available hai.</p><div className="mt-4 grid gap-3"><label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>Main <Link href="/privacy" target="_blank" className="text-[#0F5C38] underline">Privacy Policy</Link> se sahmat hoon.</span></label><label className="flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>Main <Link href="/terms" target="_blank" className="text-[#0F5C38] underline">Terms and Conditions</Link> accept karta/karti hoon.</span></label><button type="button" disabled={submitting || !privacyConsent || !termsAccepted} onClick={() => void updateConsent()} className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><ShieldCheck size={16} />{submitting ? "Updating..." : "Save consent"}</button></div></section>}

      <section className="mt-6 rounded-xl border border-[#DCE8E1] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><h2 className="text-xl font-black">Download your information</h2><p className="mt-2 text-sm leading-6 text-[#5C6B63]">Profile, education, experience, document metadata, applications, interviews, saved jobs aur privacy requests ki JSON copy download karein. Private document files export me include nahi hote; unhe profile se individually download kiya ja sakta hai.</p></div><a href="/api/candidate/privacy/export" download className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white"><Download size={17} />Download my data</a></div></section>

      <section className="mt-6 rounded-xl border border-[#F0C5BB] bg-white p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E7] text-[#B7442C]"><Trash2 size={19} /></span><div><h2 className="text-xl font-black">Delete account and personal data</h2><p className="mt-2 text-sm leading-6 text-[#5C6B63]">Request complete hone par profile, uploaded documents, education, experience aur saved jobs permanently delete ho jayenge. Recruitment/application transaction records lawful business needs ke liye candidate ID ke saath retain ho sakte hain, lekin aapka profile unse available nahi rahega.</p></div></div>
        {activeRequest ? <div className="mt-5 rounded-lg bg-[#FFF7E4] p-4"><p className="font-black text-[#7A5C0C]">Request status: {formatLabel(activeRequest.status)}</p><p className="mt-1 text-xs text-[#756B4E]">Submitted {formatDate(activeRequest.createdAt)}. In-review request ko support team process karegi.</p>{activeRequest.status === "SUBMITTED" && <button type="button" disabled={submitting} onClick={() => void cancelDeletion()} className="mt-4 rounded-lg border border-[#D8BD70] bg-white px-4 py-2 text-sm font-black text-[#7A5C0C] disabled:opacity-50">Cancel request</button>}</div> : <div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Reason (optional)<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} className="profile-input min-h-24 py-3" placeholder="Tell us why you want your data deleted" /></label><label className="grid max-w-sm gap-2 text-sm font-bold">Type DELETE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="profile-input" placeholder="DELETE" /></label><button type="button" disabled={submitting || confirmation !== "DELETE"} onClick={() => void requestDeletion()} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#B7442C] px-5 py-3 text-sm font-black text-white disabled:opacity-50"><Trash2 size={16} />{submitting ? "Submitting..." : "Request data deletion"}</button></div>}
      </section>

      <p className="mt-6 text-sm text-[#5C6B63]">Details ke liye <Link href="/privacy" className="font-black text-[#0F5C38] underline">Privacy Policy</Link> aur <Link href="/terms" className="font-black text-[#0F5C38] underline">Terms and Conditions</Link> dekhein.</p>
    </div>
  </main>;
}

function InfoCard({ icon: Icon, title, value }: { icon: typeof ShieldCheck; title: string; value: string }) { return <article className="rounded-xl border border-[#DCE8E1] bg-white p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#E9F3ED] text-[#157A4A]"><Icon size={19} /></span><h2 className="mt-4 font-black">{title}</h2><p className="mt-1 text-xs leading-5 text-[#5C6B63]">{value}</p></article>; }
function Notice({ tone, text, onClose }: { tone: "success" | "error"; text: string; onClose: () => void }) { return <div className={`mt-5 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-[#E3F3EA] text-[#1F7A4D]" : "bg-[#FFF0E7] text-[#B7442C]"}`}><span>{text}</span><button type="button" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatLabel(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
