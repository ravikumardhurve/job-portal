"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleUserRound } from "lucide-react";
import { AddressStep } from "@/components/profile-steps/address-step";
import { EducationStep } from "@/components/profile-steps/education-step";
import { ExperienceStep } from "@/components/profile-steps/experience-step";
import { JobPreferenceStep } from "@/components/profile-steps/job-preference-step";
import { DocumentsStep } from "@/components/profile-steps/documents-step";
import type { SafeCandidate } from "@/lib/constants";

export default function CandidateProfilePage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<SafeCandidate>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    fetch("/api/candidate/me").then(async (response) => {
      if (response.status === 401) { router.replace("/candidate/login"); return; }
      const result = await response.json() as { data: SafeCandidate };
      setCandidate(result.data);
    });
  }, [router]);

  async function saveBasics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const response = await fetch("/api/candidate/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: values.get("email"), city: values.get("city"), preferredRole: values.get("preferredRole") }) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save profile."); return; }
    setCandidate(result.data);
    setMessage("Profile updated successfully.");
  }

  function onSectionSaved(updated: SafeCandidate) {
    setCandidate(updated);
    setMessage("Saved successfully.");
  }

  if (!candidate) return <main className="grid min-h-screen place-items-center bg-[#F5FAF7] text-sm font-bold text-[#4B5A52]">Loading your profile...</main>;

  return (
    <main className="min-h-screen bg-[#F5FAF7] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-lg bg-[#1E2B26] p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-[#D4B04A]"><CircleUserRound size={22} /></span>
            <div>
              <p className="section-kicker text-[#D4B04A]">MY PROFILE</p>
              <h1 className="mt-1 text-2xl font-black">Complete your candidate profile</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-[#DCE8E1]">Profile completion: {candidate.profileCompletion ?? 25}% | Verification: {candidate.verificationStatus.replaceAll("_", " ")}</p>
        </div>

        {message && <p className="mt-5 rounded-md bg-[#E3F3EA] px-3 py-2 text-sm font-bold text-[#1F7A4D]">{message}</p>}
        {error && <p className="mt-5 rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}

        <ProfileSection title="Basic details">
          <form onSubmit={saveBasics} className="grid gap-5 md:grid-cols-2">
            <ReadOnlyField label="Full name" value={candidate.fullName} />
            <ReadOnlyField label="Mobile number" value={candidate.mobile} />
            <label className="grid gap-2 text-sm font-bold text-[#33473F]">Email<input name="email" type="email" defaultValue={candidate.email ?? ""} className="profile-input" /></label>
            <label className="grid gap-2 text-sm font-bold text-[#33473F]">Current city<input name="city" defaultValue={candidate.city ?? ""} className="profile-input" /></label>
            <label className="grid gap-2 text-sm font-bold text-[#33473F]">Preferred job role<input name="preferredRole" defaultValue={candidate.preferredRole ?? ""} className="profile-input" /></label>
            <div className="md:col-span-2"><button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save basic details"}</button></div>
          </form>
        </ProfileSection>

        <ProfileSection title="Address"><AddressStep candidate={candidate} onSaved={onSectionSaved} /></ProfileSection>
        <ProfileSection title="Education"><EducationStep onSaved={onSectionSaved} /></ProfileSection>
        <ProfileSection title="Experience"><ExperienceStep candidate={candidate} onSaved={onSectionSaved} /></ProfileSection>
        <ProfileSection title="Job preference"><JobPreferenceStep candidate={candidate} onSaved={onSectionSaved} /></ProfileSection>
        <ProfileSection title="Documents"><DocumentsStep /></ProfileSection>
      </div>
    </main>
  );
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-lg border border-[#D5E3DB] bg-white p-6 shadow-[0_14px_35px_rgba(130,76,40,.08)]">
      <h2 className="mb-5 text-lg font-black text-[#1E2B26]">{title}</h2>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <label className="grid gap-2 text-sm font-bold text-[#33473F]">{label}<input disabled value={value} className="profile-input bg-[#EEF5F0] text-[#5C6B63]" /></label>;
}
