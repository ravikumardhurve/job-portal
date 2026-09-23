"use client";

import { FormEvent, useState } from "react";
import { Field } from "./field";
import { CHHATTISGARH_DISTRICTS, type SafeCandidate } from "@/lib/constants";

const jobTypes: Array<{ value: string; label: string }> = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
];
const shifts: Array<{ value: string; label: string }> = [
  { value: "DAY", label: "Day shift" },
  { value: "NIGHT", label: "Night shift" },
  { value: "ROTATIONAL", label: "Rotational / both" },
];

export function JobPreferenceStep({ candidate, onSaved }: { candidate: SafeCandidate; onSaved: (candidate: SafeCandidate) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const preference = candidate.jobPreference;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const payload = {
      category: String(values.get("category") ?? "") || undefined,
      role: String(values.get("role") ?? "") || undefined,
      location: String(values.get("location") ?? "") || undefined,
      expectedSalaryMin: values.get("expectedSalaryMin") ? Number(values.get("expectedSalaryMin")) : undefined,
      expectedSalaryMax: values.get("expectedSalaryMax") ? Number(values.get("expectedSalaryMax")) : undefined,
      jobType: String(values.get("jobType") ?? "") || undefined,
      shift: String(values.get("shift") ?? "") || undefined,
      immediateJoining: values.get("immediateJoining") === "on",
    };
    const response = await fetch("/api/candidate/job-preference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save your job preference."); return; }
    onSaved(result.data);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preferred job category"><input name="category" defaultValue={preference?.category ?? ""} className="profile-input" placeholder="Security, Housekeeping, Office Jobs..." /></Field>
        <Field label="Preferred job role"><input name="role" defaultValue={preference?.role ?? candidate.preferredRole ?? ""} className="profile-input" placeholder="Security Guard" /></Field>
        <Field label="Preferred location">
          <select name="location" defaultValue={preference?.location ?? ""} className="profile-input">
            <option value="">Select</option>
            {CHHATTISGARH_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expected salary (min)"><input name="expectedSalaryMin" type="number" min={0} defaultValue={preference?.expectedSalaryMin ?? ""} className="profile-input" /></Field>
          <Field label="Expected salary (max)"><input name="expectedSalaryMax" type="number" min={0} defaultValue={preference?.expectedSalaryMax ?? ""} className="profile-input" /></Field>
        </div>
        <Field label="Job type">
          <select name="jobType" defaultValue={preference?.jobType ?? ""} className="profile-input">
            <option value="">Select</option>
            {jobTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Shift">
          <select name="shift" defaultValue={preference?.shift ?? ""} className="profile-input">
            <option value="">Select</option>
            {shifts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#33473F]">
        <input type="checkbox" name="immediateJoining" defaultChecked={preference?.immediateJoining ?? false} className="h-4 w-4" />
        I am available for immediate joining
      </label>
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}
      <button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
    </form>
  );
}
