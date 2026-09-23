"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Star, X } from "lucide-react";
import type { ServiceReview, ServiceReviewStatus } from "@/lib/portal";
import { SERVICE_PAGES, type ServicePageSlug } from "@/lib/service-pages";

const filters: Array<{ value: "ALL" | ServiceReviewStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

export function AdminReviewManager() {
  const [filter, setFilter] = useState<"ALL" | ServiceReviewStatus>("PENDING");
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    try {
      const response = await fetch(`/api/admin/reviews${query}`);
      const result = await response.json() as { data?: ServiceReview[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Reviews load nahi ho sake.");
      setReviews(result.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Reviews load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Data is loaded from the admin API; state updates happen after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function update(reviewId: string, status: "APPROVED" | "REJECTED") {
    setUpdating(reviewId);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Review update nahi ho saka.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Review update nahi ho saka.");
    } finally {
      setUpdating(undefined);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} onClick={() => { setLoading(true); setFilter(item.value); }} className={`rounded-lg px-4 py-2 text-sm font-bold ${filter === item.value ? "bg-[#E95D2B] text-white" : "border border-[#DCE6DF] bg-white text-[#65786D]"}`}>{item.label}</button>)}</div>
      {error && <p className="mt-5 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]">{error}</p>}
      {loading ? <p className="mt-7 text-sm font-semibold text-[#71837A]">Loading reviews...</p> : reviews.length === 0 ? <div className="mt-7 rounded-xl border border-dashed border-[#D5E1DA] bg-white p-10 text-center text-sm text-[#71837A]">Is filter mein koi review nahi hai.</div> : <div className="mt-7 grid gap-4 xl:grid-cols-2">{reviews.map((review) => {
        const page = SERVICE_PAGES[review.serviceSlug as ServicePageSlug];
        return <article key={review.id} className="rounded-xl border border-[#DFE8E2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.08em] text-[#E95D2B]">{page?.shortTitle ?? review.serviceSlug}</p><h2 className="mt-1 text-lg font-black">{review.customerName}</h2><p className="text-xs text-[#71837A]">{review.city || "City not shared"} · {new Date(review.createdAt).toLocaleDateString("en-IN")}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-black ${review.status === "APPROVED" ? "bg-[#E8F5ED] text-[#258653]" : review.status === "REJECTED" ? "bg-[#FDECEC] text-[#B93535]" : "bg-[#FFF4D6] text-[#8A6810]"}`}>{review.status}</span></div>
          <div className="mt-3 flex gap-0.5" aria-label={`${review.rating} stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= review.rating ? "fill-[#D4A72C] text-[#D4A72C]" : "text-[#CDD7D1]"} />)}</div>
          <p className="mt-4 text-sm leading-6 text-[#4B5A52]">{review.comment}</p>
          <div className="mt-5 flex gap-2"><button disabled={updating === review.id} onClick={() => update(review.id, "APPROVED")} className="inline-flex items-center gap-2 rounded-lg bg-[#258653] px-4 py-2 text-xs font-black text-white disabled:opacity-60"><Check size={15} /> Approve</button><button disabled={updating === review.id} onClick={() => update(review.id, "REJECTED")} className="inline-flex items-center gap-2 rounded-lg border border-[#D9A9A9] px-4 py-2 text-xs font-black text-[#B93535] disabled:opacity-60"><X size={15} /> Reject</button></div>
        </article>;
      })}</div>}
    </div>
  );
}
