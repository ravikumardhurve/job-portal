import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidateRegistrationWizard } from "@/components/candidate-registration-wizard";
import { getCandidateSession } from "@/lib/candidate-auth";

export default async function CandidateRegistrationPage() {
  if (await getCandidateSession()) redirect("/candidate/profile");
  return (
    <main className="min-h-screen bg-[#F5FAF7] px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-[#0F5C38]">Back to CG Job Care</Link>
        <p className="section-kicker mt-10 text-[#0F5C38]">CANDIDATE REGISTRATION</p>
        <h1 className="section-title">Create your candidate account.</h1>
        <p className="my-6 leading-7 text-[#4B5A52]">Enter your basic details to sign up. After login, you can add address, education, experience, job preference and documents from your profile.</p>
        <CandidateRegistrationWizard />
        <p className="mt-5 text-sm text-[#4B5A52]">Already registered? <Link href="/candidate/login" className="font-bold text-[#0F5C38]">Candidate login</Link></p>
      </div>
    </main>
  );
}
