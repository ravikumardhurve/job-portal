import type { Metadata } from "next";
import { CandidateSectionShell } from "@/components/candidate-section-shell";
import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function CandidateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getCandidateSession();
  const candidate = session ? await portalStore.getCandidateById(session.candidateId) : undefined;

  return (
    <CandidateSectionShell candidate={candidate ? { fullName: candidate.fullName } : undefined}>
      {children}
    </CandidateSectionShell>
  );
}
