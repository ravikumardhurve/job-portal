import { CandidateSectionShell } from "@/components/candidate-section-shell";
import { getCandidateSession } from "@/lib/candidate-auth";
import { portalStore } from "@/lib/portal";

export default async function CandidateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getCandidateSession();
  const candidate = session ? await portalStore.getCandidateById(session.candidateId) : undefined;

  return (
    <CandidateSectionShell candidate={candidate ? { fullName: candidate.fullName } : undefined}>
      {children}
    </CandidateSectionShell>
  );
}
