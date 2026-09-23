"use client";

import { FormEvent, useState } from "react";
import { Send, Star } from "lucide-react";
import type { ServicePageSlug } from "@/lib/service-pages";

export function ServiceReviewForm({ serviceSlug }: { serviceSlug: ServicePageSlug }) {
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/service-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, serviceSlug, rating }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Review submit nahi ho saka.");
      form.reset();
      setRating(5);
      setMessage(result.message ?? "Review verification ke baad publish hoga.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Review submit nahi ho saka.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#DCE8E1] bg-white p-6 shadow-sm">
      <p className="text-xs font-black tracking-[.12em] text-[#157A4A]">SHARE YOUR EXPERIENCE</p>
      <h3 className="mt-2 text-2xl font-black">Apna review dein</h3>
      <p className="mt-2 text-sm leading-6 text-[#5C6B63]">Har review verification ke baad publish hota hai.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Name<input name="customerName" required minLength={2} maxLength={80} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">City<input name="city" maxLength={80} className="admin-input" /></label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-bold">Rating</legend>
        <div className="mt-2 flex gap-1" aria-label={`${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star`} className="p-1"><Star size={24} className={value <= rating ? "fill-[#D4A72C] text-[#D4A72C]" : "text-[#B9C8C0]"} /></button>)}
        </div>
      </fieldset>
      <label className="mt-4 grid gap-2 text-sm font-bold">Your review<textarea name="comment" required minLength={15} maxLength={1000} className="admin-input min-h-28 py-3" placeholder="Service ke baare mein apna experience share karein..." /></label>
      {message && <p className="mt-4 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]">{message}</p>}
      {error && <p className="mt-4 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]">{error}</p>}
      <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white disabled:opacity-60"><Send size={16} />{busy ? "Submitting..." : "Submit review"}</button>
    </form>
  );
}
