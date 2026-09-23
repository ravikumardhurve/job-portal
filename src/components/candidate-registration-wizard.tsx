"use client";

import { useRouter } from "next/navigation";
import { BasicInfoStep } from "./profile-steps/basic-info-step";

export function CandidateRegistrationWizard() {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-[#D5E3DB] bg-white p-6 shadow-[0_14px_35px_rgba(130,76,40,.08)] sm:p-8">
      <BasicInfoStep onRegistered={() => { router.replace("/candidate/dashboard"); router.refresh(); }} />
    </div>
  );
}
