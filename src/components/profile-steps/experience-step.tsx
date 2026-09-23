"use client";

import { FormEvent, useEffect, useState } from "react";
import { Field } from "./field";
import type { SafeCandidate } from "@/lib/constants";

type Experience = { company?: string; jobRole?: string; salary?: string; startDate?: string; endDate?: string; responsibilities?: string };

export function ExperienceStep({ candidate, onSaved }: { candidate: SafeCandidate; onSaved: (candidate: SafeCandidate) => void }) {
  const [experienceType, setExperienceType] = useState<"FRESHER" | "EXPERIENCED">(candidate.experienceType ?? "FRESHER");
  const [experience, setExperience] = useState<Experience>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/candidate/experience").then(async (response) => {
      const result = await response.json() as { data: Experience | null };
      setExperience(result.data ?? {});
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const payload = {
      experienceType,
      totalExperienceYears: experienceType === "EXPERIENCED" && values.get("totalExperienceYears") ? Number(values.get("totalExperienceYears")) : undefined,
      company: experienceType === "EXPERIENCED" ? String(values.get("company") ?? "") || undefined : undefined,
      jobRole: experienceType === "EXPERIENCED" ? String(values.get("jobRole") ?? "") || undefined : undefined,
      salary: experienceType === "EXPERIENCED" ? String(values.get("salary") ?? "") || undefined : undefined,
      startDate: experienceType === "EXPERIENCED" ? String(values.get("startDate") ?? "") || undefined : undefined,
      endDate: experienceType === "EXPERIENCED" ? String(values.get("endDate") ?? "") || undefined : undefined,
      responsibilities: experienceType === "EXPERIENCED" ? String(values.get("responsibilities") ?? "") || undefined : undefined,
    };
    const response = await fetch("/api/candidate/experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save your experience details."); return; }
    onSaved(result.data);
  }

  if (!experience) return <p className="text-sm text-[#5C6B63]">Loading...</p>;

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="flex gap-3">
        <button type="button" onClick={() => setExperienceType("FRESHER")} className={`rounded-lg border px-4 py-2.5 text-sm font-bold ${experienceType === "FRESHER" ? "border-[#157A4A] bg-[#E9F3ED] text-[#0F5C38]" : "border-[#D5E3DB] text-[#5C6B63]"}`}>Fresher</button>
        <button type="button" onClick={() => setExperienceType("EXPERIENCED")} className={`rounded-lg border px-4 py-2.5 text-sm font-bold ${experienceType === "EXPERIENCED" ? "border-[#157A4A] bg-[#E9F3ED] text-[#0F5C38]" : "border-[#D5E3DB] text-[#5C6B63]"}`}>Experienced</button>
      </div>
      {experienceType === "EXPERIENCED" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total experience (years)"><input name="totalExperienceYears" type="number" min={0} step={0.5} defaultValue={candidate.totalExperienceYears ?? ""} className="profile-input" /></Field>
          <Field label="Current / last company"><input name="company" defaultValue={experience.company ?? ""} className="profile-input" /></Field>
          <Field label="Current / last job role"><input name="jobRole" defaultValue={experience.jobRole ?? ""} className="profile-input" /></Field>
          <Field label="Current / last salary"><input name="salary" defaultValue={experience.salary ?? ""} className="profile-input" placeholder="Rs. 15,000 / month" /></Field>
          <Field label="Employment start date"><input name="startDate" type="date" defaultValue={experience.startDate ?? ""} className="profile-input" /></Field>
          <Field label="Employment end date"><input name="endDate" type="date" defaultValue={experience.endDate ?? ""} className="profile-input" /></Field>
          <div className="sm:col-span-2"><Field label="Responsibilities"><textarea name="responsibilities" defaultValue={experience.responsibilities ?? ""} className="profile-input min-h-24 py-3" /></Field></div>
        </div>
      )}
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}
      <button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
    </form>
  );
}
