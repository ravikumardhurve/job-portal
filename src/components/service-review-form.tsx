"use client";

import { FormEvent, useState } from "react";
import { Send, Star } from "lucide-react";
import type { ServicePageSlug } from "@/lib/service-pages";
import styles from "./service-review-form.module.css";

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
    <form onSubmit={submit} className={styles.form} aria-label="Share your service experience" aria-busy={busy}>
      <p className={styles.eyebrow}>YOUR EXPERIENCE MATTERS</p>
      <h3>Share your review.</h3>
      <p className={styles.intro}>Har review verification ke baad publish hota hai.</p>
      <div className={styles.fields}>
        <label>Name<input name="customerName" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your name" /></label>
        <label>City <span>(optional)</span><input name="city" autoComplete="address-level2" maxLength={80} placeholder="Your city" /></label>
      </div>
      <fieldset className={styles.rating}>
        <legend>Your rating</legend>
        <div className={styles.ratingRow}>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`Rate ${value} out of 5 stars`} aria-pressed={rating === value}><Star size={25} className={value <= rating ? styles.filled : styles.unfilled} /></button>)}
          </div>
          <span aria-live="polite">{rating} / 5</span>
        </div>
      </fieldset>
      <label className={styles.comment}>Your review<textarea name="comment" required minLength={15} maxLength={1000} rows={4} placeholder="Service ke baare mein apna experience share karein..." aria-describedby="review-length-hint" /></label>
      <p id="review-length-hint" className={styles.hint}>15–1,000 characters. Please don&apos;t include personal contact details.</p>
      {message && <p role="status" className={styles.success}>{message}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" disabled={busy} className={styles.submit}><Send size={16} />{busy ? "Submitting..." : "Submit review"}</button>
    </form>
  );
}
