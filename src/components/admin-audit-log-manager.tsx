"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import type { AuditLog } from "@/lib/admin-operations";

export function AdminAuditLogManager() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (signal: AbortSignal) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/audit-logs?${params}`, { signal });
      const result = await response.json() as { data?: AuditLog[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Audit history load nahi ho paayi.");
      setLogs(result.data ?? []);
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "Audit history load nahi ho paayi.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [from, q, to]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  return <main>
    <div><p className="section-kicker text-[#E95D2B]">SUPER ADMIN SECURITY</p><h1 className="mt-2 text-3xl font-black">Audit history</h1><p className="mt-2 text-sm text-[#71837A]">Admin login, data access aur workflow changes ki history.</p></div>
    <section aria-label="Audit filters" className="mt-6 grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-[1fr_190px_190px]">
      <label className="flex h-11 items-center gap-2 rounded-lg border px-3"><Search size={17} /><span className="sr-only">Search audit history</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Actor, action, target type ya ID" className="min-w-0 flex-1 outline-none" /></label>
      <input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="admin-input" />
      <input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="admin-input" />
    </section>
    {error && <div role="alert" className="mt-5 rounded-lg bg-[#FFF0E7] p-4 text-sm font-bold text-[#C9471E]">{error} <button type="button" onClick={() => void load(new AbortController().signal)} className="ml-2 underline">Retry</button></div>}
    <section className="mt-6 overflow-hidden rounded-xl border bg-white" aria-busy={loading}>
      {loading ? <p className="p-6 text-sm text-[#71837A]" role="status">Audit history loading...</p> : !error && logs.length === 0 ? <p className="p-8 text-center text-sm text-[#71837A]">Is filter ke liye koi audit entry nahi mili. Dates ya search term badalkar dekhein.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#F7FAF8] text-xs text-[#71837A]"><tr><th scope="col" className="px-5 py-3">TIME</th><th scope="col">ACTOR</th><th scope="col">ACTION</th><th scope="col">TARGET</th><th scope="col">DETAILS</th></tr></thead><tbody>{logs.map((log, index) => <tr key={`${log.targetId}:${log.createdAt}:${index}`} className="border-t align-top"><td className="px-5 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("en-IN")}</td><td><p className="font-bold">{log.actor?.name ?? log.actorId}</p><p className="text-xs text-[#71837A]">{log.actor?.email}</p></td><td><span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-black text-[#3D69BE]"><ShieldCheck size={12} />{log.action.replaceAll("_", " ")}</span></td><td><p className="font-bold">{log.targetType}</p><p className="text-xs text-[#71837A]">{log.targetId}</p></td><td className="max-w-sm py-4 pr-5"><code className="break-words text-[11px] text-[#52665C]">{JSON.stringify(log.metadata ?? {})}</code>{log.ipAddress && <p className="mt-1 text-[10px] text-[#8A9991]">IP {log.ipAddress}</p>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
