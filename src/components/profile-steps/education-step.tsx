"use client";

import { FormEvent, useEffect, useState } from "react";
import { Field } from "./field";
import type { SafeCandidate } from "@/lib/constants";

const qualifications = ["Below 8th", "8th Pass", "10th Pass", "12th Pass", "ITI", "Diploma", "Graduate", "Post Graduate", "Other"];

type Education = { qualification: string; course?: string; specialization?: string; institution?: string; passingYear?: string; percentage?: string };

export function EducationStep({ onSaved }: { onSaved: (candidate: SafeCandidate) => void }) {
  const [education, setEducation] = useState<Education>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/candidate/education").then(async (response) => {
      const result = await response.json() as { data: Education | null };
      setEducation(result.data ?? { qualification: "" });
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const payload = {
      qualification: String(values.get("qualification") ?? ""),
      course: String(values.get("course") ?? "") || undefined,
      specialization: String(values.get("specialization") ?? "") || undefined,
      institution: String(values.get("institution") ?? "") || undefined,
      passingYear: String(values.get("passingYear") ?? "") || undefined,
      percentage: String(values.get("percentage") ?? "") || undefined,
    };
    const response = await fetch("/api/candidate/education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save your education details."); return; }
    onSaved(result.data);
  }

  if (!education) return <p className="text-sm text-[#5C6B63]">Loading...</p>;

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Highest qualification">
          <select name="qualification" defaultValue={education.qualification} required className="profile-input">
            <option value="">Select</option>
            {qualifications.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Course"><input name="course" defaultValue={education.course ?? ""} className="profile-input" placeholder="B.A., B.Com, ITI Electrician..." /></Field>
        <Field label="Specialization"><input name="specialization" defaultValue={education.specialization ?? ""} className="profile-input" /></Field>
        <Field label="School / College / University"><input name="institution" defaultValue={education.institution ?? ""} className="profile-input" /></Field>
        <Field label="Passing year"><input name="passingYear" defaultValue={education.passingYear ?? ""} className="profile-input" placeholder="2022" /></Field>
        <Field label="Marks / percentage (optional)"><input name="percentage" defaultValue={education.percentage ?? ""} className="profile-input" /></Field>
      </div>
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}
      <button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
    </form>
  );
}
