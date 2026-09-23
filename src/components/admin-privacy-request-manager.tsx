"use client";

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

  return <main className="min-h-screen bg-[#F5F7F5] text-[#25372E]"><div className="mx-auto max-w-7xl px-5 py-8"><div><p className="section-kicker text-[#E95D2B]">DATA RIGHTS OPERATIONS</p><h1 className="mt-2 text-3xl font-black">Candidate privacy requests</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#71837A]">Deletion requests review karein. Completion se pehle candidate identity aur open operational obligations verify karna admin ki responsibility hai.</p></div>
    {message && <Notice tone="success" text={message} onClose={() => setMessage(undefined)} />}{error && <Notice tone="error" text={error} onClose={() => setError(undefined)} />}
    <section className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="New requests" value={pending} icon={ShieldAlert} color="bg-[#FFF0E7] text-[#C9471E]" /><Metric label="In review" value={inReview} icon={Clock3} color="bg-[#FFF7D9] text-[#8A6810]" /><Metric label="Completed" value={completed} icon={CheckCircle2} color="bg-[#E8F5ED] text-[#258653]" /></section>
    <section className="mt-6 grid gap-3 rounded-xl border border-[#E0E8E2] bg-white p-4 sm:grid-cols-[1fr_220px]"><label className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E7E2] px-3"><Search size={17} className="text-[#E95D2B]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Candidate, mobile, email ya request ID" className="min-w-0 flex-1 text-sm outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="admin-input"><option value="ALL">All statuses</option>{["SUBMITTED", "IN_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></section>
    <section className="mt-6 overflow-hidden rounded-xl border border-[#E0E8E2] bg-white"><div className="border-b border-[#E7EEE9] px-5 py-4"><h2 className="font-black">Request records</h2><p className="mt-1 text-xs text-[#71837A]">{loading ? "Loading..." : `${filtered.length} requests`}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-[#F7FAF8] text-xs font-bold text-[#71837A]"><tr><th className="px-5 py-3">REQUEST</th><th>CANDIDATE</th><th>REASON</th><th>SUBMITTED</th><th>STATUS</th><th className="px-5">ACTION</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t border-[#EDF1EE] align-top"><td className="px-5 py-4"><p className="font-black">{item.id}</p><p className="mt-1 text-xs text-[#71837A]">Data deletion</p></td><td className="py-4"><p className="font-black">{item.candidate?.fullName ?? "Profile deleted"}</p><p className="mt-1 text-xs text-[#71837A]">{item.candidate?.mobile ?? item.candidateId}</p><p className="mt-1 text-xs text-[#71837A]">{item.candidate?.email}</p></td><td className="max-w-72 py-4 text-xs leading-5 text-[#52665C]">{item.reason ?? "No reason provided"}{item.resolutionNote && <p className="mt-2 font-bold">Resolution: {item.resolutionNote}</p>}</td><td className="py-4"><p className="font-semibold">{formatDate(item.createdAt)}</p></td><td className="py-4"><Status status={item.status} /></td><td className="px-5 py-4">{["SUBMITTED", "IN_REVIEW"].includes(item.status) ? <div className="flex gap-2">{item.status === "SUBMITTED" && <button disabled={updating === item.id} onClick={() => void update(item, "IN_REVIEW")} className="rounded-md border border-[#D8BD70] px-3 py-2 text-xs font-black text-[#80620F]">Review</button>}<button disabled={updating === item.id} onClick={() => void update(item, "COMPLETED")} className="inline-flex items-center gap-1 rounded-md bg-[#157A4A] px-3 py-2 text-xs font-black text-white"><Trash2 size={13} />Delete data</button><button disabled={updating === item.id} onClick={() => void update(item, "REJECTED")} className="rounded-md border border-[#E4B6AC] px-3 py-2 text-xs font-black text-[#B7442C]">Reject</button></div> : <span className="text-xs text-[#8A9991]">Resolved</span>}</td></tr>)}{!loading && !filtered.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm font-bold text-[#71837A]">Koi matching privacy request nahi mili.</td></tr>}</tbody></table></div></section>
  </div></main>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof ShieldAlert; color: string }) { return <article className="flex items-center gap-4 rounded-xl border border-[#E0E8E2] bg-white p-5"><span className={`grid h-11 w-11 place-items-center rounded-lg ${color}`}><Icon size={20} /></span><div><p className="text-2xl font-black">{value}</p><p className="text-xs font-bold text-[#71837A]">{label}</p></div></article>; }
function Status({ status }: { status: CandidatePrivacyRequestStatus }) { const color = status === "COMPLETED" ? "bg-[#E8F5ED] text-[#258653]" : status === "REJECTED" || status === "CANCELLED" ? "bg-[#F1F2F1] text-[#68766F]" : status === "IN_REVIEW" ? "bg-[#FFF7D9] text-[#80620F]" : "bg-[#FFF0E7] text-[#C9471E]"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${color}`}>{formatLabel(status)}</span>; }
function Notice({ tone, text, onClose }: { tone: "success" | "error"; text: string; onClose: () => void }) { return <div className={`mt-5 flex justify-between gap-3 rounded-lg px-4 py-3 text-sm font-bold ${tone === "success" ? "bg-[#E8F5ED] text-[#258653]" : "bg-[#FFF0E7] text-[#C9471E]"}`}><span>{text}</span><button onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>; }
function formatLabel(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
