"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, BadgeCheck } from "lucide-react";

export type HeroJob = {
  id: string;
  title: string;
  city: string;
  vacancies: number;
  salaryMin: number;
  salaryMax: number;
  image: string;
};

export function HeroJobsCarousel({ jobs }: { jobs: HeroJob[] }) {
  const [index, setIndex] = useState(0);

  if (jobs.length === 0) {
    return (
      <div className="relative flex h-full flex-col justify-between p-7">
        <div className="flex items-center justify-between"><p className="text-xs font-bold tracking-[0.14em] text-[#EBD9A6]">OPEN TODAY</p><BadgeCheck size={22} className="text-[#EBD9A6]" /></div>
        <div>
          <h2 className="text-2xl font-black leading-tight lg:text-3xl">Fresh opportunities in Chhattisgarh</h2>
          <p className="mt-4 leading-7 text-[#E7F2EA]">Published jobs, recruitment and facility support from one local team.</p>
          <Link href="/jobs" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white">View opportunity <ArrowRight size={16} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" role="group" aria-roledescription="carousel" aria-label="Latest job opportunities">
      {jobs[index] && (
          <div key={jobs[index].id} className="relative h-full w-full">
            <Image src={jobs[index].image} alt="" fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 46vw" unoptimized={jobs[index].image.startsWith("http")} className="object-cover" />
            <div className="hero-photo-shade absolute inset-0" />
            <div className="relative flex h-full flex-col justify-between p-7 text-white">
              <div className="flex items-center justify-between"><p className="text-xs font-bold tracking-[0.14em] text-[#EBD9A6]">OPEN TODAY</p><BadgeCheck size={22} className="text-[#EBD9A6]" /></div>
              <div>
                <h2 className="text-2xl font-black leading-tight lg:text-3xl">{jobs[index].title} required in {jobs[index].city}</h2>
                <p className="mt-4 leading-7 text-[#E7F2EA]">{jobs[index].vacancies} vacancies | Rs. {jobs[index].salaryMin.toLocaleString("en-IN")} - {jobs[index].salaryMax.toLocaleString("en-IN")}</p>
                <Link href={`/jobs/${jobs[index].id}`} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white">View opportunity <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>
      )}
      {jobs.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {jobs.map((job, i) => <button key={job.id} type="button" onClick={() => setIndex(i)} aria-label={`Show job ${i + 1} of ${jobs.length}: ${job.title}`} aria-pressed={i === index} className="grid h-8 w-8 place-items-center rounded-full"><span className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`} /></button>)}
        </div>
      )}
    </div>
  );
}
