"use client";

import { AdminFilters } from "@/components/admin-filters";

import styles from "@/components/admin-management.module.css";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilterX,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, businessVerticalForServiceType } from "@/lib/admin-scope";
import type { ServiceRequest } from "@/lib/portal";
import { SERVICE_REQUEST_STATUSES } from "@/lib/statuses";

type ServiceType = ServiceRequest["serviceType"];
type RequestStatus = ServiceRequest["status"];

const SERVICE_TYPES: ServiceType[] = ["SECURITY", "BABY_CARE", "CARETAKER", "HOUSEKEEPING", "PEST_CONTROL", "MANPOWER", "OTHER"];

const serviceLabels: Record<ServiceType, string> = {
  SECURITY: "Security service",
  BABY_CARE: "Baby care",
  CARETAKER: "Caretaker service",
  HOUSEKEEPING: "Housekeeping",
  PEST_CONTROL: "Pest control",
  MANPOWER: "Manpower service",
  OTHER: "Other service",
};

const workflowHelp: Record<RequestStatus, string> = {
  NEW: "Customer se contact karke requirement, location aur preferred schedule confirm karein.",
  CONTACTED: "Requirement clear hone ke baad service scope, staff availability aur estimate share karein.",
  CONFIRMED: "Assigned team aur start date final karke request ko in progress karein.",
  IN_PROGRESS: "Service delivery monitor karein aur completion ke baad customer feedback lein.",
  COMPLETED: "Request complete hai. Customer review aur repeat-service follow-up record kar sakte hain.",
  CANCELLED: "Request cancel hai. Zarurat ho to customer se reason confirm karke dobara activate karein.",
};

export function AdminServiceRequestManager() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [serviceType, setServiceType] = useState<"ALL" | ServiceType>("ALL");
  const [status, setStatus] = useState<"ALL" | RequestStatus>("ALL");
  const [city, setCity] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [updatingId, setUpdatingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/admin/service-requests");
      const result = await response.json() as { data?: ServiceRequest[]; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Service requests load nahi ho saki.");
      setRequests(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Service requests load nahi ho saki.");
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

  const cities = useMemo(() => [...new Set(requests.map((request) => request.city).filter(Boolean))].sort(), [requests]);
  const availableServiceTypes = useMemo(() => SERVICE_TYPES.filter((type) => requests.some((request) => request.serviceType === type)), [requests]);
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchable = [request.id, request.customerName, request.mobile, request.city, request.address, serviceLabels[request.serviceType]].join(" ").toLowerCase();
    const createdDate = request.createdAt.slice(0, 10);
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (serviceType === "ALL" || request.serviceType === serviceType)
      && (status === "ALL" || request.status === status)
      && (city === "ALL" || request.city === city)
      && (!dateFrom || createdDate >= dateFrom)
      && (!dateTo || createdDate <= dateTo);
  }), [city, dateFrom, dateTo, query, requests, serviceType, status]);

  const counts = useMemo(() => ({
    total: requests.length,
    new: requests.filter((request) => request.status === "NEW").length,
    active: requests.filter((request) => ["CONTACTED", "CONFIRMED", "IN_PROGRESS"].includes(request.status)).length,
    completed: requests.filter((request) => request.status === "COMPLETED").length,
  }), [requests]);

  const selected = requests.find((request) => request.id === selectedId);
  const filtersActive = Boolean(query || serviceType !== "ALL" || status !== "ALL" || city !== "ALL" || dateFrom || dateTo);

  async function update(request: ServiceRequest, nextStatus: RequestStatus) {
    if (request.status === nextStatus) return;
    setUpdatingId(request.id);
    setMessage(undefined);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/service-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { data?: ServiceRequest; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Service request status update nahi hua.");
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...result.data } : item));
      setMessage(`${request.customerName} ki request ${formatLabel(nextStatus)} stage par move ho gayi.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Service request status update nahi hua.");
    } finally {
      setUpdatingId(undefined);
    }
  }

  async function saveOperations(request: ServiceRequest, values: Pick<ServiceRequest, "assignedStaff" | "assignedVendor" | "scheduledAt" | "internalNotes">) {
    setUpdatingId(request.id); setMessage(undefined); setError(undefined);
    try {
      const response = await fetch(`/api/admin/service-requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json() as { data?: ServiceRequest; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Service operations save nahi hue.");
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...result.data } : item)); setMessage("Assignment, schedule aur internal notes save ho gaye.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Service operations save nahi hue."); }
    finally { setUpdatingId(undefined); }
  }

  function clearFilters() {
    setQuery("");
    setServiceType("ALL");
    setStatus("ALL");
    setCity("ALL");
    setDateFrom("");
    setDateTo("");
  }

  return <main className={styles.page}>
    <div className={styles.body}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="section-kicker text-[#2447e5]">SERVICE OPERATIONS</p><h1 className="mt-2 text-2xl sm:text-3xl font-black">Service requests</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#657189]">Customer ki requirement, location aur service category ek jagah dekhein. Contact se completion tak poora workflow yahin manage karein.</p></div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-[#11182b] px-4 py-3 text-sm font-bold text-white"><ClipboardList size={17} />{loading ? "Loading..." : `${filteredRequests.length} of ${requests.length}`}</span>
      </div>

      {message && <Notice tone="success" text={message} onClose={() => setMessage(undefined)} />}
      {error && <Notice tone="error" text={error} onClose={() => setError(undefined)} />}

      <section className={`${styles.stats} mt-4 sm:mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
        <Metric label="All requests" value={counts.total} icon={ClipboardList} color="bg-[#EAF1FF] text-[#3D69BE]" />
        <Metric label="New requests" value={counts.new} icon={Sparkles} color="bg-[#FFF0E7] text-[#C9471E]" />
        <Metric label="Active work" value={counts.active} icon={Clock3} color="bg-[#FFF7D9] text-[#8A6810]" />
        <Metric label="Completed" value={counts.completed} icon={CheckCircle2} color="bg-[#E8F5ED] text-[#258653]" />
      </section>

      <AdminFilters search={<label className="flex h-11 items-center gap-2 rounded-lg border border-[#dfe4ed] px-3 focus-within:border-[#2447e5] focus-within:ring-2 focus-within:ring-[#e5ebff]"><Search size={18} className="text-[#2447e5]" /><input aria-label="Customer, mobile, request ID, city ya address" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, mobile, request ID, city ya address" className="min-w-0 flex-1 text-sm outline-none" /></label>} activeCount={[status !== "ALL", serviceType !== "ALL", city !== "ALL", Boolean(dateFrom), Boolean(dateTo)].filter(Boolean).length}>
        <div className="grid gap-3 lg:grid-cols-[1.5fr_230px_210px]">

          <select aria-label="Service type" value={serviceType} onChange={(event) => setServiceType(event.target.value as "ALL" | ServiceType)} className="admin-input"><option value="ALL">All services</option>{availableServiceTypes.map((type) => <option key={type} value={type}>{serviceLabels[type]}</option>)}</select>
          <select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as "ALL" | RequestStatus)} className="admin-input"><option value="ALL">All statuses</option>{SERVICE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px_auto]">
          <select aria-label="City" value={city} onChange={(event) => setCity(event.target.value)} className="admin-input"><option value="ALL">All cities</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#657189]">Received from<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#657189]">Received to<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="admin-input" /></label>
          <button type="button" disabled={!filtersActive} onClick={clearFilters} className="inline-flex h-11 self-end items-center justify-center gap-2 rounded-lg border border-[#dfe4ed] px-4 text-sm font-bold text-[#4e5c73] disabled:opacity-40"><FilterX size={16} />Clear</button>
        </div>
      </AdminFilters>

      <section className="mt-4 sm:mt-6 overflow-hidden rounded-xl border border-[#e5e8f0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f5] px-5 py-4"><div><h2 className="font-black">Customer requests</h2><p className="mt-1 text-xs text-[#657189]">Status change audit log ke saath save hota hai.</p></div><span className="rounded-full bg-[#f2f4fa] px-3 py-1.5 text-xs font-bold text-[#657189]">{filteredRequests.length} matching</span></div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Service requests table. Scroll horizontally for more columns."><table role="table" className={`${styles.table} w-full min-w-[1120px] text-left text-sm`}><thead className="bg-[#f8f9fc] text-xs font-bold text-[#657189]"><tr><th scope="col" className="px-5 py-3">REQUEST / CUSTOMER</th><th scope="col">SERVICE</th><th scope="col">LOCATION</th><th scope="col">RECEIVED</th><th scope="col">STATUS</th><th scope="col" className="px-5">ACTION</th></tr></thead><tbody>{filteredRequests.map((request) => {
          const vertical = businessVerticalForServiceType(request.serviceType);
          const busy = updatingId === request.id;
          return <tr key={request.id} className="border-t border-[#edf0f5] align-top hover:bg-[#f9faff]">
            <td data-label="REQUEST / CUSTOMER" data-primary="true" className="px-5 py-4"><p className="font-black">{request.customerName}</p><a href={`tel:${request.mobile}`} className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2447e5]"><Phone size={13} />{request.mobile}</a><p className="mt-1 text-[11px] text-[#758096]">{request.id}</p></td>
            <td data-label="SERVICE" className="py-4"><p className="font-black">{serviceLabels[request.serviceType]}</p><p className="mt-1 text-xs text-[#657189]">{BUSINESS_VERTICAL_LABELS[vertical]}</p>{request.staffRequired ? <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#4e5c73]"><UsersRound size={13} />{request.staffRequired} staff required</p> : null}</td>
            <td data-label="LOCATION" className="max-w-64 py-4"><p className="inline-flex items-center gap-1.5 font-bold"><MapPin size={14} className="text-[#2447e5]" />{request.city}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#657189]">{request.address}</p></td>
            <td data-label="RECEIVED" className="py-4"><p className="font-semibold">{formatDate(request.createdAt)}</p><p className="mt-1 text-xs text-[#657189]">{formatTime(request.createdAt)}</p></td>
            <td data-label="STATUS" className="py-4"><StatusBadge status={request.status} /></td>
            <td data-label="ACTION" data-actions="true" className="px-5 py-4"><div className="flex items-center gap-2"><select disabled={busy} value={request.status} onChange={(event) => void update(request, event.target.value as RequestStatus)} aria-label={`Update ${request.id} status`} className="h-9 rounded-md border border-[#dfe4ed] bg-white px-2 text-xs font-black disabled:opacity-50">{SERVICE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><button type="button" disabled={busy} onClick={() => setSelectedId(request.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#11182b] px-3 text-xs font-black text-white disabled:opacity-50">Details<ChevronRight size={14} /></button></div></td>
          </tr>;
        })}{!loading && !filteredRequests.length && <tr><td colSpan={6} className="px-5 py-16 text-center"><ClipboardList size={30} className="mx-auto text-[#b5bfd1]" /><p className="mt-3 font-bold text-[#4e5c73]">Koi matching service request nahi mili</p><p className="mt-1 text-xs text-[#758096]">Filters clear karein ya date range badlein.</p></td></tr>}</tbody></table></div>
      </section>
    </div>

    {selected && <RequestDrawer key={`${selected.id}:${selected.updatedAt ?? ""}`} request={selected} busy={updatingId === selected.id} message={message} error={error} onClose={() => setSelectedId(undefined)} onUpdate={update} onSaveOperations={saveOperations} onDismissMessage={() => setMessage(undefined)} onDismissError={() => setError(undefined)} />}
  </main>;
}

function RequestDrawer({ request, busy, message, error, onClose, onUpdate, onSaveOperations, onDismissMessage, onDismissError }: { request: ServiceRequest; busy: boolean; message?: string; error?: string; onClose: () => void; onUpdate: (request: ServiceRequest, status: RequestStatus) => Promise<void>; onSaveOperations: (request: ServiceRequest, values: Pick<ServiceRequest, "assignedStaff" | "assignedVendor" | "scheduledAt" | "internalNotes">) => Promise<void>; onDismissMessage: () => void; onDismissError: () => void }) {
  const vertical = businessVerticalForServiceType(request.serviceType);
  const whatsapp = whatsappLink(request.mobile, request);
  const [assignedStaff, setAssignedStaff] = useState(request.assignedStaff ?? "");
  const [assignedVendor, setAssignedVendor] = useState(request.assignedVendor ?? "");
  const [scheduledAt, setScheduledAt] = useState(request.scheduledAt?.slice(0, 16) ?? "");
  const [internalNotes, setInternalNotes] = useState(request.internalNotes ?? "");
  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} className="fixed inset-0 z-50 flex justify-end bg-[#18221D]/65 backdrop-blur-sm"><aside role="dialog" aria-modal="true" aria-labelledby="request-detail-title" className={`${styles.drawer} flex h-full w-full max-w-2xl flex-col bg-[#f5f6fa] shadow-2xl`}>
    <header className="flex items-start justify-between gap-4 border-b border-[#e5e8f0] bg-white px-5 py-4 sm:px-7"><div><p className="text-xs font-black tracking-[.1em] text-[#2447e5]">SERVICE REQUEST DETAILS</p><h2 id="request-detail-title" className="mt-1 text-xl sm:text-2xl font-black">{request.customerName}</h2><p className="mt-1 text-xs text-[#657189]">{request.id} · Received {formatDate(request.createdAt)}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close request details" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f4fa] text-[#4e5c73] disabled:opacity-50"><X size={19} /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
      {message && <Notice tone="success" text={message} onClose={onDismissMessage} compact />}{error && <Notice tone="error" text={error} onClose={onDismissError} compact />}

      <section className="rounded-xl bg-[#11182b] p-3.5 sm:p-5 text-white"><p className="text-xs font-bold tracking-[.1em] text-[#FFCF68]">CURRENT WORKFLOW STATUS</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><div><StatusBadge status={request.status} dark /><p className="mt-3 max-w-md text-xs leading-5 text-[#cbd4eb]">{workflowHelp[request.status]}</p></div><select disabled={busy} value={request.status} onChange={(event) => void onUpdate(request, event.target.value as RequestStatus)} className="h-11 min-w-48 rounded-lg border border-white/15 bg-white px-3 text-sm font-black text-[#20283b] disabled:opacity-50">{SERVICE_REQUEST_STATUSES.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></div></section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2"><a href={`tel:${request.mobile}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2447e5] px-4 text-sm font-black text-white"><Phone size={17} />Call customer</a><a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#BBD8C8] bg-white px-4 text-sm font-black text-[#2447e5]"><MessageCircle size={17} />Open WhatsApp</a></div>

      <section className="mt-5 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><SectionTitle icon={Wrench} title="Service requirement" subtitle="Category, business field aur required staff" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Service" value={serviceLabels[request.serviceType]} /><Info label="Business field" value={BUSINESS_VERTICAL_LABELS[vertical]} /><Info label="Staff required" value={request.staffRequired ? String(request.staffRequired) : "Not specified"} /><Info label="Current status" value={formatLabel(request.status)} /></div></section>

      <section className="mt-5 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><SectionTitle icon={MapPin} title="Customer & location" subtitle="Contact aur service delivery address" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Customer name" value={request.customerName} /><Info label="Mobile number" value={request.mobile} /><Info label="City" value={request.city} /><Info label="Request ID" value={request.id} /><div className="sm:col-span-2"><Info label="Complete address" value={request.address} /></div></div></section>

      <section className="mt-5 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><SectionTitle icon={UsersRound} title="Assignment and schedule" subtitle="Staff/vendor allocation aur internal execution notes" /><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Assigned staff<input value={assignedStaff} onChange={(event) => setAssignedStaff(event.target.value)} className="admin-input" placeholder="Staff name or team" /></label><label className="grid gap-2 text-sm font-bold">Assigned vendor<input value={assignedVendor} onChange={(event) => setAssignedVendor(event.target.value)} className="admin-input" placeholder="Vendor/company name" /></label><label className="grid gap-2 text-sm font-bold">Scheduled date and time<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold sm:col-span-2">Internal admin notes<textarea value={internalNotes} maxLength={2000} onChange={(event) => setInternalNotes(event.target.value)} className="admin-input min-h-28 py-3" /></label></div><button type="button" disabled={busy} onClick={() => void onSaveOperations(request, { assignedStaff, assignedVendor, scheduledAt, internalNotes })} className="mt-4 rounded-lg bg-[#2447e5] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving..." : "Save operations"}</button></section>

      <section className="mt-5 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><SectionTitle icon={ShieldCheck} title="Request record" subtitle="Submission aur last workflow activity" /><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Received" value={`${formatDate(request.createdAt)}, ${formatTime(request.createdAt)}`} /><Info label="Last updated" value={request.updatedAt ? `${formatDate(request.updatedAt)}, ${formatTime(request.updatedAt)}` : "No status update yet"} /></div></section>
    </div>
  </aside></div>;
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: string }) {
  return <article className="flex items-center gap-4 rounded-xl border border-[#e5e8f0] bg-white p-3.5 sm:p-5"><span className={`grid h-11 w-11 place-items-center rounded-lg ${color}`}><Icon size={21} /></span><div><p className="text-xl sm:text-2xl font-black">{value}</p><p className="mt-0.5 text-xs font-bold text-[#657189]">{label}</p></div></article>;
}

function StatusBadge({ status, dark = false }: { status: RequestStatus; dark?: boolean }) {
  const styles: Record<RequestStatus, string> = {
    NEW: "bg-[#FFF0E7] text-[#C9471E]",
    CONTACTED: "bg-[#EAF1FF] text-[#3D69BE]",
    CONFIRMED: "bg-[#F6ECFF] text-[#7F4BB0]",
    IN_PROGRESS: "bg-[#FFF7D9] text-[#80620F]",
    COMPLETED: "bg-[#E8F5ED] text-[#258653]",
    CANCELLED: "bg-[#F1F2F1] text-[#68766F]",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${styles[status]} ${dark ? "ring-1 ring-white/20" : ""}`}>{formatLabel(status)}</span>;
}

function Notice({ tone, text, onClose, compact = false }: { tone: "success" | "error"; text: string; onClose: () => void; compact?: boolean }) {
  return <div className={`${compact ? "mb-4" : "mt-5"} flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${tone === "success" ? "border-[#BFE0CC] bg-[#ECF8F1] text-[#176E43]" : "border-[#F0C5BB] bg-[#FFF1EE] text-[#A43B25]"}`}><span>{text}</span><button type="button" onClick={onClose} aria-label="Dismiss message"><X size={16} /></button></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; subtitle: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF0E7] text-[#C9471E]"><Icon size={17} /></span><div><h3 className="font-black">{title}</h3><p className="mt-0.5 text-xs text-[#657189]">{subtitle}</p></div></div>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg bg-[#f8f9fc] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#758096]">{label}</p><p className="mt-1 break-words text-sm font-bold text-[#31453A]">{value || "Not available"}</p></div>;
}

function formatLabel(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
function whatsappLink(mobile: string, request: ServiceRequest) {
  const digits = mobile.replace(/\D/g, "");
  const number = digits.length === 10 ? `91${digits}` : digits;
  const message = `Namaste ${request.customerName}, CG Job Care se aapki ${serviceLabels[request.serviceType]} request (${request.id}) ke sambandh mein sampark kar rahe hain.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
