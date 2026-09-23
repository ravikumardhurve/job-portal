"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bookmark, BriefcaseBusiness, MapPin } from "lucide-react";
import { SaveJobButton } from "@/components/save-job-button";

type SavedJob = { jobId: string; job?: { id: string; title: string; company: string; city: string; salaryMin: number; salaryMax: number } };

export default function SavedJobsPage() {
  const router = useRouter();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>();

  useEffect(() => {
    fetch("/api/candidate/saved-jobs").then(async (response) => {
      if (response.status === 401) { router.replace("/candidate/login"); return; }
      const result = await response.json() as { data: SavedJob[] };
      setSavedJobs(result.data);
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-[#EEF5F0] text-[#1F332C]">
      <header className="border-b border-[#DCE8E1] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/candidate/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[#0F5C38]"><ArrowLeft size={16} /> Dashboard</Link>
          <Link href="/jobs" className="text-sm font-bold text-[#0F5C38]">Browse jobs</Link>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-9">
        <p className="section-kicker text-[#157A4A]">SAVED JOBS</p>
        <h1 className="mt-2 text-3xl font-black">Jobs you have saved</h1>
        <p className="mt-3 text-sm leading-6 text-[#5C6B63]">Come back here any time to apply once you are ready.</p>
        <div className="mt-7 grid gap-4">
          {savedJobs?.map((savedJob) => (
            <article key={savedJob.jobId} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#DCE8E1] bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#E9F3ED] text-[#157A4A]"><BriefcaseBusiness size={20} /></span>
                <div>
                  <h2 className="font-bold">{savedJob.job?.title ?? "Job"}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#5C6B63]"><MapPin size={13} />{savedJob.job ? `${savedJob.job.company} | ${savedJob.job.city}` : "Job details unavailable"}</p>
                  {savedJob.job && <p className="mt-1 text-xs font-semibold text-[#5C6B63]">Rs. {savedJob.job.salaryMin.toLocaleString("en-IN")} - {savedJob.job.salaryMax.toLocaleString("en-IN")}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveJobButton jobId={savedJob.jobId} initialSaved />
                <Link href={savedJob.job ? `/jobs/${savedJob.job.id}` : "/jobs"} className="inline-flex items-center gap-1 rounded-lg border border-[#DCE8E1] px-4 py-2 text-sm font-bold text-[#0F5C38]">View job <ArrowRight size={14} /></Link>
              </div>
            </article>
          ))}
          {savedJobs && !savedJobs.length && (
            <div className="rounded-lg border border-dashed border-[#DCE8E1] bg-white p-10 text-center">
              <Bookmark size={26} className="mx-auto text-[#157A4A]" />
              <h2 className="mt-3 font-black">No saved jobs yet</h2>
              <p className="mt-2 text-sm text-[#5C6B63]">Save interesting jobs while browsing to find them here later.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
