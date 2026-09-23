import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, UsersRound } from "lucide-react";
import { JobExplorer } from "@/components/job-explorer";
import { SiteHeader } from "@/components/site-header";
import { portalStore, type JobSearchFilters } from "@/lib/portal";
import { SALARY_BANDS } from "@/lib/constants";
import { getCandidateSession } from "@/lib/candidate-auth";

export const metadata: Metadata = {
  title: "Jobs in Raipur & Chhattisgarh | Latest Vacancies - CG Job Care",
  description: "Search latest jobs in Raipur, Bhilai, Durg, Bilaspur and across Chhattisgarh. Find fresher and experienced vacancies with salary and location details.",
  keywords: ["jobs in Raipur", "jobs in Chhattisgarh", "fresher jobs Raipur", "private jobs Raipur", "security guard jobs", "housekeeping jobs", "caretaker jobs"],
  alternates: { canonical: "/jobs" },
  openGraph: { title: "Jobs in Raipur & Chhattisgarh | CG Job Care", description: "Explore current local job vacancies with clear salary, location and application details.", url: "/jobs", type: "website", locale: "en_IN" },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const params = await searchParams;
  const q = first(params.q);
  const city = first(params.city);
  const category = first(params.category);
  const employmentTypeParam = first(params.employmentType);
  const employmentType = (["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"] as const).find((value) => value === employmentTypeParam);
  const shiftParam = first(params.shift);
  const shift = (["DAY", "NIGHT", "ROTATIONAL"] as const).find((value) => value === shiftParam);
  const fresherOnly = first(params.fresherOnly) === "true";
  const sortParam = first(params.sort);
  const sort = (["latest", "salary_high", "salary_low"] as const).find((value) => value === sortParam) ?? "latest";
  const requestedPage = Number(first(params.page));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const salaryMinParam = first(params.salaryMin);
  const salaryMaxParam = first(params.salaryMax);
  const requestedSalaryMin = Number(salaryMinParam);
  const requestedSalaryMax = Number(salaryMaxParam);
  const salaryMin = salaryMinParam && Number.isFinite(requestedSalaryMin) && requestedSalaryMin >= 0 ? requestedSalaryMin : undefined;
  const salaryMax = salaryMaxParam && Number.isFinite(requestedSalaryMax) && requestedSalaryMax >= 0 ? requestedSalaryMax : undefined;
  const salaryBand = SALARY_BANDS.find((band) => {
    const [min, max] = band.value.split("-");
    return (min ? Number(min) : undefined) === salaryMin && (max ? Number(max) : undefined) === salaryMax;
  })?.value ?? "";

  const filters: JobSearchFilters = { q, city, category, employmentType, shift, fresherOnly, salaryMin, salaryMax, sort, page };
  const session = await getCandidateSession();
  const [result, savedJobIds] = await Promise.all([
    portalStore.listPublishedJobs(filters),
    session ? portalStore.listSavedJobIds(session.candidateId) : Promise.resolve([]),
  ]);
  // Strip Mongo's ObjectId `_id` — it can't cross the server-to-client component boundary.
  const jobs: typeof result.data = JSON.parse(JSON.stringify(result.data));

  return <main className="min-h-screen bg-[#F5FAF7] text-[#1E2B26]"><SiteHeader /><section className="border-b border-[#DCE8E1] bg-[#EEF5F0]"><div className="mx-auto max-w-6xl px-5 py-12 lg:px-8"><p className="section-kicker text-[#0F5C38]">FIND YOUR NEXT ROLE</p><h1 className="section-title">Local opportunities, clearly presented.</h1><p className="mt-4 max-w-2xl leading-7 text-[#4B5A52]">Search published openings across Raipur and Chhattisgarh. Register once, then let our team guide the next steps.</p><div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold text-[#4B5A52]"><span className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-[#157A4A]" />Clear employer details</span><span className="inline-flex items-center gap-2"><UsersRound size={18} className="text-[#157A4A]" />Local support team</span><span className="inline-flex items-center gap-2"><BriefcaseBusiness size={18} className="text-[#157A4A]" />Simple application journey</span></div></div></section><section className="mx-auto max-w-6xl px-5 py-10 lg:px-8"><JobExplorer initialJobs={jobs} initialTotal={result.total} initialPageSize={result.pageSize} initialFilters={{ q: q ?? "", city: city ?? "All locations", category: category ?? "", employmentType: employmentType ?? "", shift: shift ?? "", salaryBand, fresherOnly, sort, page }} initialSavedJobIds={savedJobIds} /></section>{session ? <section className="mx-auto mb-14 flex max-w-6xl flex-wrap items-center justify-between gap-5 rounded-lg bg-[#1E2B26] px-6 py-7 text-white"><div><h2 className="text-xl font-black">Keep your profile sharp.</h2><p className="mt-1 text-sm text-[#D5E3DB]">A complete profile means better matches and faster shortlisting.</p></div><Link href="/candidate/profile" className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-4 py-2.5 text-sm font-bold">Update profile <ArrowRight size={16} /></Link></section> : <section className="mx-auto mb-14 flex max-w-6xl flex-wrap items-center justify-between gap-5 rounded-lg bg-[#1E2B26] px-6 py-7 text-white"><div><h2 className="text-xl font-black">Don&apos;t see the right role yet?</h2><p className="mt-1 text-sm text-[#D5E3DB]">Create a profile and get ready for the next matching opportunity.</p></div><Link href="/candidate/register" className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-4 py-2.5 text-sm font-bold">Start registration <ArrowRight size={16} /></Link></section>}</main>;
}
