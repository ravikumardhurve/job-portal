import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, CalendarDays, CircleCheck, Clock3, MapPin, WalletCards } from "lucide-react";
import { portalStore, type Job } from "@/lib/portal";
import { ApplyButton } from "@/components/apply-button";
import { SaveJobButton } from "@/components/save-job-button";
import { ShareJobButton } from "@/components/share-job-button";
import { SiteHeader } from "@/components/site-header";
import { getCandidateSession } from "@/lib/candidate-auth";

function toSchemaEmploymentType(type: Job["employmentType"]) {
  return type === "CONTRACT" ? "CONTRACTOR" : type;
}

export async function generateMetadata({ params }: PageProps<"/jobs/[jobId]">): Promise<Metadata> {
  const { jobId } = await params;
  const job = await portalStore.getPublishedJob(jobId);
  if (!job) return { title: "Job not found | CG Job Care" };
  const title = `${job.title} in ${job.city} | CG Job Care`;
  const description = `${job.title} at ${job.company} in ${job.city}, Chhattisgarh. Salary Rs. ${job.salaryMin.toLocaleString("en-IN")} - ${job.salaryMax.toLocaleString("en-IN")} per month. ${job.vacancies} vacancies. Apply now with CG Job Care.`;
  const canonical = `/jobs/${job.id}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website", locale: "en_IN" }, twitter: { card: "summary", title, description } };
}

export default async function JobDetailPage({ params }: PageProps<"/jobs/[jobId]">) {
  const { jobId } = await params;
  const [job, session] = await Promise.all([portalStore.getPublishedJob(jobId), getCandidateSession()]);

  if (!job) return <main className="grid min-h-screen place-items-center bg-[#F5FAF7] p-5"><div className="max-w-md text-center"><p className="section-kicker text-[#157A4A]">JOB NOT AVAILABLE</p><h1 className="section-title">This opportunity is no longer active.</h1><Link href="/jobs" className="mt-7 inline-flex rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white">Browse open jobs</Link></div></main>;

  const salary = `Rs. ${job.salaryMin.toLocaleString("en-IN")} - ${job.salaryMax.toLocaleString("en-IN")} per month`;
  const savedJobIds = session ? await portalStore.listSavedJobIds(session.candidateId) : [];
  const initialSaved = savedJobIds.includes(job.id);
  const description = job.description ?? "We are looking for reliable candidates who are ready to work with a local employer. CG Job Care will guide eligible candidates through profile verification, interview coordination and joining.";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted: job.postedAt,
    ...(job.applicationDeadline ? { validThrough: job.applicationDeadline } : {}),
    employmentType: toSchemaEmploymentType(job.employmentType),
    hiringOrganization: { "@type": "Organization", name: job.company },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city, addressRegion: job.district, addressCountry: "IN" } },
    baseSalary: { "@type": "MonetaryAmount", currency: "INR", value: { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax, unitText: "MONTH" } },
  };
  return <main className="min-h-screen bg-[#F5FAF7] text-[#1E2B26]"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", String.fromCharCode(92) + "u003c") }} /><SiteHeader /><div className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-[#5C6B63]"><ArrowLeft size={16} /> Back to jobs</Link><div className="mt-6 grid gap-7 lg:grid-cols-[1fr_320px]"><article className="rounded-lg border border-[#DCE8E1] bg-white p-6 shadow-[0_12px_35px_rgba(130,76,40,.07)] sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${job.urgent ? "bg-[#FBE4D6] text-[#C2410C]" : "bg-[#E3F3EA] text-[#1F7A4D]"}`}>{job.urgent ? "Urgent hiring" : "Published opportunity"}</div><h1 className="mt-5 text-3xl font-black sm:text-4xl">{job.title}</h1><p className="mt-2 text-base text-[#4B5A52]">{job.company}</p></div><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#E9F3ED] text-[#157A4A]"><BriefcaseBusiness size={22} /></span></div><div className="mt-8 grid gap-4 border-y border-[#DCE8E1] py-6 sm:grid-cols-2"><p className="detail-item"><MapPin size={18} />{job.city}, {job.district}</p><p className="detail-item"><WalletCards size={18} />{salary}</p><p className="detail-item"><Clock3 size={18} />{job.employmentType.replaceAll("_", " ")}</p><p className="detail-item"><CalendarDays size={18} />{job.vacancies} open positions</p></div><section className="mt-8"><h2 className="text-xl font-extrabold">About this role</h2><p className="mt-3 leading-7 text-[#4B5A52]">{description}</p></section><section className="mt-8"><h2 className="text-xl font-extrabold">What you can expect</h2><ul className="mt-4 grid gap-3 text-sm text-[#4B5A52]"><li className="flex gap-2"><CircleCheck size={18} className="shrink-0 text-[#157A4A]" />Clear recruitment updates from our local team</li><li className="flex gap-2"><CircleCheck size={18} className="shrink-0 text-[#157A4A]" />Interview and document support where applicable</li><li className="flex gap-2"><CircleCheck size={18} className="shrink-0 text-[#157A4A]" />No duplicate applications for the same vacancy</li></ul></section></article><aside className="h-fit rounded-lg bg-[#1E2B26] p-6 text-white shadow-[0_18px_40px_rgba(36,26,20,0.16)]"><BadgeCheck size={24} className="text-[#D4B04A]" /><h2 className="mt-5 text-2xl font-black">Interested in this job?</h2><p className="mt-3 text-sm leading-6 text-[#D5E3DB]">{session ? "You're logged in — apply in one click." : "Apply now if you already have an account, or register first to get started."}</p><div className="mt-6"><ApplyButton jobId={job.id} /></div>{!session && <p className="mt-3 text-center text-xs text-[#D5E3DB]">New here? <Link href="/candidate/register" className="font-bold text-white underline underline-offset-4">Register first</Link></p>}<SaveJobButton jobId={job.id} initialSaved={initialSaved} variant="full" /><ShareJobButton title={job.title} /></aside></div></div></main>;
}
