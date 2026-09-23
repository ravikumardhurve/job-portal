"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Field } from "./field";
import type { SafeCandidate } from "@/lib/constants";

export function BasicInfoStep({ onRegistered }: { onRegistered: (candidate: SafeCandidate) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const payload = {
      fullName: String(values.get("fullName") ?? ""),
      mobile: String(values.get("mobile") ?? ""),
      password: String(values.get("password") ?? ""),
      email: String(values.get("email") ?? ""),
      city: String(values.get("city") ?? ""),
      isAdult: values.get("isAdult") === "on",
      privacyConsent: values.get("privacyConsent") === "on",
      termsAccepted: values.get("termsAccepted") === "on",
    };
    const response = await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Something went wrong. Please try again."); return; }
    onRegistered(result.data);
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name"><input name="fullName" required className="profile-input" /></Field>
      <Field label="Mobile number"><input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required className="profile-input" placeholder="10 digit mobile number" /></Field>
      <Field label="Email"><input name="email" type="email" required className="profile-input" /></Field>
      <Field label="Location"><input name="city" required className="profile-input" placeholder="City or district" /></Field>
      <div className="sm:col-span-2">
        <Field label="Create login password"><input name="password" type="password" required minLength={8} autoComplete="new-password" className="profile-input" /></Field>
        <p className="mt-2 text-xs leading-5 text-[#6B7A72]">Use at least 8 characters. This password is only used to secure your candidate login.</p>
      </div>
      <div className="grid gap-3 rounded-lg border border-[#D5E3DB] bg-[#F7FAF8] p-4 text-sm text-[#43564C] sm:col-span-2">
        <label className="flex items-start gap-3"><input name="isAdult" type="checkbox" required className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>I confirm that I am 18 years of age or older.</span></label>
        <label className="flex items-start gap-3"><input name="privacyConsent" type="checkbox" required className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>I have read the <Link href="/privacy" target="_blank" className="font-black text-[#0F5C38] underline">Privacy Policy</Link> and consent to processing my profile data for recruitment and placement support.</span></label>
        <label className="flex items-start gap-3"><input name="termsAccepted" type="checkbox" required className="mt-1 h-4 w-4 accent-[#157A4A]" /><span>I accept the <Link href="/terms" target="_blank" className="font-black text-[#0F5C38] underline">Terms and Conditions</Link>.</span></label>
      </div>
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38] sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button disabled={saving} className="w-full rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:w-auto">{saving ? "Creating account..." : "Create account"}</button>
      </div>
    </form>
  );
}
