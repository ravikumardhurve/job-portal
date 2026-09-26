import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bookmark, BriefcaseBusiness, Check, MapPin } from "lucide-react";
import { JobExplorer } from "@/components/job-explorer";
import { SiteHeader } from "@/components/site-header";
import { portalStore, type JobSearchFilters } from "@/lib/portal";
import { SALARY_BANDS } from "@/lib/constants";
import { getCandidateSession } from "@/lib/candidate-auth";
import styles from "./jobs.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const title = `Jobs in Raipur & Chhattisgarh | ${settings.companyName}`;
  const description = "Explore local job vacancies with salary, location and application details. Find fresher and experienced roles across Chhattisgarh.";
  return {
    title, description,
    keywords: ["jobs in Raipur", "jobs in Chhattisgarh", "fresher jobs", "security guard jobs", "housekeeping jobs"],
    alternates: { canonical: "/jobs" },
    openGraph: { title, description, url: "/jobs", type: "website", locale: "en_IN", siteName: settings.companyName },
  };
}

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
  })?.value ?? ((salaryMin !== undefined || salaryMax !== undefined) ? `${salaryMin ?? ""}-${salaryMax ?? ""}` : "");

  const filters: JobSearchFilters = { q, city, category, employmentType, shift, fresherOnly, salaryMin, salaryMax, sort, page };
  const session = await getCandidateSession();
  const [result, savedJobIds, categories, settings] = await Promise.all([
    portalStore.listPublishedJobs(filters),
    session ? portalStore.listSavedJobIds(session.candidateId) : Promise.resolve([]),
    portalStore.listJobCategories(),
    portalStore.getSiteSettings(),
  ]);
  // Strip Mongo's ObjectId `_id` — it can't cross the server-to-client component boundary.
  const jobs: typeof result.data = JSON.parse(JSON.stringify(result.data));

  return (
    <main className={`classic-page ${styles.page}`}>
      <SiteHeader />
      <section className={styles.hero} aria-labelledby="jobs-heading">
        <div className={`classic-container ${styles.heroGrid}`}>
          <div>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Find Jobs</span></nav>
            <p className="classic-eyebrow">YOUR NEXT CHAPTER</p>
            <h1 id="jobs-heading">Good work.<br /><span>Closer to</span> <em>home.</em></h1>
            <p className={styles.intro}>Find your next opportunity in Raipur and across Chhattisgarh. Explore roles that fit your skills, location and goals.</p>
            <div className={styles.highlights}><span><MapPin size={15} />Local opportunities</span><span><Check size={15} />Clear salary details</span></div>
          </div>
          <aside className={styles.guide}>
            <span className={styles.guideIcon}><BriefcaseBusiness size={25} /></span>
            <p>MAKE YOUR NEXT MOVE</p>
            <h2>A simpler way<br />to find your fit.</h2>
            <ul><li><span>01</span>Explore roles near you</li><li><span>02</span>Save the ones you like</li><li><span>03</span>View details and apply</li></ul>
            <Link href={session ? "/candidate/saved-jobs" : "/candidate/register"}>{session ? <Bookmark size={16} /> : <BriefcaseBusiness size={16} />}{session ? "Your saved jobs" : "Create your profile"}<ArrowRight size={16} /></Link>
          </aside>
        </div>
      </section>
      <section className={`classic-container ${styles.catalog}`} aria-label="Find job opportunities">
        <JobExplorer initialJobs={jobs} initialTotal={result.total} initialPageSize={result.pageSize} initialCategories={categories}
          initialFilters={{ q: q ?? "", city: city ?? "All locations", category: category ?? "", employmentType: employmentType ?? "", shift: shift ?? "", salaryBand, fresherOnly, sort, page }}
          initialSavedJobIds={savedJobIds} />
      </section>
      <section className={`classic-container ${styles.cta}`}>
        <div><p>READY FOR WHAT&apos;S NEXT?</p><h2>{session ? "Your next step starts with you." : "Your next opportunity starts here."}</h2><span>{session ? "Keep your skills and preferences up to date so our team can support your search." : "Create a profile and be ready to apply when the right role comes along."}</span></div>
        <Link href={session ? "/candidate/profile" : "/candidate/register"} className="classic-button classic-button-white">{session ? "Update Profile" : "Create Your Profile"}<ArrowRight size={17} /></Link>
      </section>
      <footer className={styles.footer}><div className="classic-container"><div><Link href="/">{settings.companyName}</Link>{settings.tagline && <p>{settings.tagline}</p>}</div><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>&copy; {new Date().getFullYear()} {settings.companyName}</small></div></footer>
    </main>
  );
}
