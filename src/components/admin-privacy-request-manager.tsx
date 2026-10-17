"use client";

import { AdminFilters } from "@/components/admin-filters";

import styles from "@/components/admin-management.module.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Search, ShieldAlert, Trash2, X } from "lucide-react";
import type { Candidate, CandidatePrivacyRequest, CandidatePrivacyRequestStatus } from "@/lib/portal";

type AdminPrivacyRequest = CandidatePrivacyRequest & { candidate?: Candidate };

export function AdminPrivacyRequestManager() {
  const [requests, setRequests] = useState<AdminPrivacyRequest[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | CandidatePrivacyRequestStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/privacy-requests");
      const result = await response.json() as { data?: AdminPrivacyRequest[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Privacy requests load nahi hui.");
      setRequests(result.data);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Privacy requests load nahi hui."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const filtered = useMemo(() => requests.filter((item) => {
    const searchable = [item.id, item.candidateId, item.candidate?.fullName, item.candidate?.mobile, item.candidate?.email, item.reason].filter(Boolean).join(" ").toLowerCase();
    return (!query.trim() || searchable.includes(query.trim().toLowerCase())) && (status === "ALL" || item.status === status);
  }), [query, requests, status]);

  async function update(item: AdminPrivacyRequest, nextStatus: "IN_REVIEW" | "COMPLETED" | "REJECTED") {
    let resolutionNote = "";
    if (nextStatus === "REJECTED") {
      resolutionNote = window.prompt("Rejection ka clear reason likhein:")?.trim() ?? "";
      if (!resolutionNote) return;
    }
    if (nextStatus === "COMPLETED" && !window.confirm(`${item.candidate?.fullName ?? item.candidateId} ka profile aur private documents permanently delete honge. Continue?`)) return;
    setUpdating(item.id); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/privacy-requests/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, resolutionNote }) });
      const result = await response.json() as { data?: CandidatePrivacyRequest; error?: string; message?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Privacy request update nahi hui.");
      setRequests((current) => current.map((row) => row.id === item.id ? { ...row, ...result.data, ...(nextStatus === "COMPLETED" ? { candidate: undefined } : {}) } : row));
      setMessage(result.message ?? "Privacy request updated.");
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Privacy request update nahi hui."); }
    finally { setUpdating(undefined); }
  }

  const pending = requests.filter((item) => item.status === "SUBMITTED").length;
  const inReview = requests.filter((item) => item.status === "IN_REVIEW").length;
  const completed = requests.filter((item) => item.status === "COMPLETED").length;

  return <main className={styles.page}><div className={styles.body}><div><p className="section-kicker text-[#2447e5]">DATA RIGHTS OPERATIONS</p><h1 className="mt-2 text-2xl sm:text-3xl font-black">Candidate privacy requests</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#657189]">Deletion requests review karein. Completion se pehle candidate identity aur open operational obligations verify karna admin ki responsibility hai.</p></div>
    {message && <Notice tone="success" text={message} onClose={() => setMessage(undefined)} />}{error && <Notice tone="error" text={error} onClose={() => setError(undefined)} />}
    <section className={`${styles.stats} mt-4 sm:mt-6 grid gap-4 sm:grid-cols-3`}><Metric label="New requests" value={pending} icon={ShieldAlert} color="bg-[#FFF0E7] text-[#C9471E]" /><Metric label="In review" value={inReview} icon={Clock3} color="bg-[#FFF7D9] text-[#8A6810]" /><Metric label="Completed" value={completed} icon={CheckCircle2} color="bg-[#E8F5ED] text-[#258653]" /></section>
    <AdminFilters search={<label className="flex h-11 items-center gap-2 rounded-lg border border-[#dfe4ed] px-3"><Search size={17} className="text-[#2447e5]" /><input aria-label="Candidate, mobile, email ya request ID" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Candidate, mobile, email ya request ID" className="min-w-0 flex-1 text-sm outline-none" /></label>} activeCount={status === "ALL" ? 0 : 1}><select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="admin-input"><option value="ALL">All statuses</option>{["SUBMITTED", "IN_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></AdminFilters>
    <section className="mt-4 sm:mt-6 overflow-hidden rounded-xl border border-[#e5e8f0] bg-white"><div className="border-b border-[#edf0f5] px-5 py-4"><h2 className="font-black">Request records</h2><p className="mt-1 text-xs text-[#657189]">{loading ? "Loading..." : `${filtered.length} requests`}</p></div><div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Privacy requests table. Scroll horizontally for more columns."><table role="table" className={`${styles.table} w-full min-w-[1000px] text-left text-sm`}><thead className="bg-[#f8f9fc] text-xs font-bold text-[#657189]"><tr><th scope="col" className="px-5 py-3">REQUEST</th><th scope="col">CANDIDATE</th><th scope="col">REASON</th><th scope="col">SUBMITTED</th><th scope="col">STATUS</th><th scope="col" className="px-5">ACTION</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-[#edf0f5] align-top"><td data-label="REQUEST" className="px-5 py-4"><p className="font-black">{item.id}</p><p className="mt-1 text-xs text-[#657189]">Data deletion</p></td><td data-label="CANDIDATE" data-primary="true" className="py-4"><p className="font-black">{item.candidate?.fullName ?? "Profile deleted"}</p><p className="mt-1 text-xs text-[#657189]">{item.candidate?.mobile ?? item.candidateId}</p><p className="mt-1 text-xs text-[#657189]">{item.candidate?.email}</p></td><td data-label="REASON" className="max-w-72 py-4 text-xs leading-5 text-[#4e5c73]">{item.reason ?? "No reason provided"}{item.resolutionNote && <p className="mt-2 font-bold">Resolution: {item.resolutionNote}</p>}</td><td data-label="SUBMITTED" className="py-4"><p className="font-semibold">{formatDate(item.createdAt)}</p></td><td data-label="STATUS" className="py-4"><Status status={item.status} /></td><td data-label="ACTION" data-actions="true" className="px-5 py-4">{["SUBMITTED", "IN_REVIEW"].includes(item.status) ? <div className="flex gap-2">{item.status === "SUBMITTED" && <button disabled={updating === item.id} onClick={() => void update(item, "IN_REVIEW")} className="rounded-md border border-[#D8BD70] px-3 py-2 text-xs font-black text-[#80620F]">Review</button>}<button disabled={updating === item.id} onClick={() => void update(item, "COMPLETED")} className="inline-flex items-center gap-1 rounded-md bg-[#2447e5] px-3 py-2 text-xs font-black text-white"><Trash2 size={13} />Delete data</button><button disabled={updating === item.id} onClick={() => void update(item, "REJECTED")} className="rounded-md border border-[#E4B6AC] px-3 py-2 text-xs font-black text-[#B7442C]">Reject</button></div> : <span className="text-xs text-[#758096]">Resolved</span>}</td></tr>)}{!loading && !filtered.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm font-bold text-[#657189]">Koi matching privacy request nahi mili.</td></tr>}</tbody></table></div></section>
  </div></main>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof ShieldAlert; color: string }) { return <article className="flex items-center gap-4 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><span className={`grid h-11 w-11 place-items-center rounded-lg ${color}`}><Icon size={20} /></span><div><p className="text-xl sm:text-2xl font-black">{value}</p><p className="text-xs font-bold text-[#657189]">{label}</p></div></article>; }
function Status({ status }: { status: CandidatePrivacyRequestStatus }) { const color = status === "COMPLETED" ? "bg-[#E8F5ED] text-[#258653]" : status === "REJECTED" || status === "CANCELLED" ? "bg-[#F1F2F1] text-[#68766F]" : status === "IN_REVIEW" ? "bg-[#FFF7D9] text-[#80620F]" : "bg-[#FFF0E7] text-[#C9471E]"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${color}`}>{formatLabel(status)}</span>; }
function Notice({ tone, text, onClose }: { tone: "success" | "error"; text: string; onClose: () => void }) { return <div className={`mt-5 flex justify-between gap-3 rounded-lg px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-[#E8F5ED] text-[#258653]" : "bg-[#FFF0E7] text-[#C9471E]"}`}><span>{text}</span><button onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>; }
function formatLabel(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
