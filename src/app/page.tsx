import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, HeartHandshake, MapPin, Menu, Phone, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

const services = [
  { icon: BriefcaseBusiness, title: "Job Placement", text: "Local opportunities for freshers and experienced candidates.", color: "bg-[#e9f5ef] text-[#13795b]" },
  { icon: ShieldCheck, title: "Security Services", text: "Verified guards, supervisors and site-ready teams.", color: "bg-[#eaf2fb] text-[#1769b0]" },
  { icon: HeartHandshake, title: "Care Services", text: "Baby, elder and patient care professionals.", color: "bg-[#fff0e8] text-[#d45d27]" },
  { icon: Sparkles, title: "Pest Control", text: "Safe, practical solutions for home and business.", color: "bg-[#f4edff] text-[#7945b3]" },
  { icon: UsersRound, title: "Housekeeping", text: "Reliable staffing for every work environment.", color: "bg-[#fff7dc] text-[#9c7300]" },
];

const jobs = [
  { title: "Security Guard", company: "SecurePoint Facilities", location: "Raipur", salary: "Rs. 13,000 - 16,000", type: "Full Time", tag: "Urgent hiring" },
  { title: "Office Assistant", company: "Aarav Enterprises", location: "Bhilai", salary: "Rs. 11,000 - 14,000", type: "Full Time", tag: "Verified employer" },
  { title: "Patient Care Attendant", company: "CareFirst Services", location: "Raipur", salary: "Rs. 14,000 - 18,000", type: "Day / Night shift", tag: "12 vacancies" },
];

export default function Home() {
  return (
    <main>
      <div className="bg-[#e95d2b] px-5 py-2 text-center text-xs font-semibold text-white sm:text-sm">Raipur aur Chhattisgarh ke liye trusted jobs aur manpower support <a href="#jobs" className="ml-2 font-bold underline underline-offset-4">Urgent vacancies dekhein</a></div>
      <header className="sticky top-0 z-30 border-b border-[#e6ece7] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-5 px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="CG Job Care home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e95d2b] text-sm font-black text-white shadow-sm">CG</span>
            <span className="leading-tight"><strong className="block text-[15px] text-[#35231c]">CG Job Care</strong><small className="text-[11px] text-[#8b776d]">Facility Services</small></span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#6b5145] lg:flex">
            <Link className="hover:text-[#e95d2b]" href="/jobs">Find jobs</Link><a className="hover:text-[#e95d2b]" href="#services">Services</a><Link className="hover:text-[#e95d2b]" href="/about">About us</Link><Link className="hover:text-[#e95d2b]" href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2"><a href="tel:+919999999999" className="hidden h-10 w-10 place-items-center rounded-lg border border-[#eeded4] text-[#e95d2b] md:grid" aria-label="Call CG Job Care"><Phone size={18} /></a><Link href="/candidate/register" className="hidden rounded-lg bg-[#e95d2b] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d64b1d] sm:block">Candidate login</Link><button className="grid h-10 w-10 place-items-center rounded-lg border border-[#eeded4] text-[#35231c] lg:hidden" aria-label="Open menu"><Menu size={19} /></button></div>
        </div>
      </header>

      <section id="top" className="hero-grid relative overflow-hidden bg-[#fff4e8] text-[#35231c]">
        <div className="hero-sun absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#ffd161] opacity-70" />
        <div className="relative mx-auto grid min-h-[590px] max-w-7xl gap-12 px-5 py-18 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#ffe3d4] px-3 py-1.5 text-xs font-bold tracking-wide text-[#c9471e]"><Sparkles size={14} /> RAIPUR | CHHATTISGARH</p>
            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.04] sm:text-5xl lg:text-7xl">Naukri chahiye?<br /><span className="text-[#e95d2b]">Hum aapke saath hain.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#72564a]">Jobs, security, care aur facility services. Ek hi local team se, simple aur trusted support.</p>
            <form className="mt-9 grid gap-2 rounded-lg border border-[#f0ddd0] bg-white p-2 shadow-[0_16px_45px_rgba(136,80,46,.13)] sm:grid-cols-[1fr_180px_auto]" action="#jobs">
              <label className="sr-only" htmlFor="keyword">Job role or skill</label><div className="flex items-center gap-2 px-3"><Search size={19} className="text-[#7a8f85]" /><input id="keyword" placeholder="Job title or skill" className="h-12 min-w-0 flex-1 text-sm text-[#183d32] outline-none placeholder:text-[#82948c]" /></div>
              <label className="sr-only" htmlFor="location">Location</label><div className="flex items-center border-l border-[#e4ece7] px-2"><MapPin size={18} className="shrink-0 text-[#13795b]" /><select id="location" className="h-12 w-full bg-white px-2 text-sm font-medium text-[#40594d] outline-none" defaultValue="Raipur"><option>Raipur</option><option>Bhilai</option><option>Durg</option><option>Bilaspur</option><option>All Chhattisgarh</option></select></div>
              <button className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#e95d2b] px-6 text-sm font-bold text-white hover:bg-[#d64b1d]">Search jobs <ArrowRight size={17} /></button>
            </form>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#72564a]"><span className="font-semibold text-[#35231c]">Popular:</span><a href="#jobs" className="underline underline-offset-4">Security Guard</a><a href="#jobs" className="underline underline-offset-4">Office Assistant</a><a href="#jobs" className="underline underline-offset-4">Caretaker</a></div>
          </div>
          <aside className="hero-photo-card self-end overflow-hidden rounded-lg bg-[#35231c] p-7 text-white shadow-[12px_14px_0_#ffc857]">
            <div className="hero-photo-shade absolute inset-0" /><div className="relative"><div className="flex items-center justify-between"><p className="text-xs font-bold tracking-[0.14em] text-[#ffe4ad]">OPEN TODAY</p><BadgeCheck size={22} className="text-[#ffe4ad]" /></div>
            <h2 className="mt-4 text-3xl font-black leading-tight">50 Security Guards required in Raipur</h2>
            <p className="mt-4 leading-7 text-[#f7ddd1]">Day and night shifts. Police-verification support available for eligible candidates.</p>
            <a href="#jobs" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white">View opportunity <ArrowRight size={16} /></a></div>
          </aside>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">WHAT WE DO</p><h2 className="section-title">One team. Five essential services.</h2></div><a href="#request" className="text-sm font-bold text-[#176b57]">Request a service</a></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{services.map((service) => { const Icon = service.icon; return <article key={service.title} className="group min-h-60 rounded-lg border border-[#e2eae4] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#b8d9c8] hover:shadow-xl"><span className={`grid h-11 w-11 place-items-center rounded-lg ${service.color}`}><Icon size={21} /></span><h3 className="mt-8 text-lg font-extrabold text-[#17362f]">{service.title}</h3><p className="mt-3 text-sm leading-6 text-[#70837a]">{service.text}</p><span className="mt-6 inline-flex items-center gap-1 text-xs font-bold text-[#13795b]">Learn more <ArrowRight size={14} /></span></article>; })}</div>
      </section>

      <section id="jobs" className="bg-[#17362f] py-20 text-white"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-9 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker text-[#f8c56b]">FRESH OPPORTUNITIES</p><h2 className="section-title text-white">Latest jobs in Chhattisgarh</h2></div><Link href="/jobs" className="border border-[#e5efe5] px-4 py-2 text-sm font-bold">Browse all jobs</Link></div><div className="grid gap-4 lg:grid-cols-3">{jobs.map((job, index) => <article key={job.title} className="bg-white p-6 text-[#17362f]"><p className="text-xs font-bold tracking-wide text-[#bf4d2a]">{job.tag.toUpperCase()}</p><h3 className="mt-5 text-2xl font-black">{job.title}</h3><p className="mt-2 text-sm text-[#60736a]">{job.company} | {job.location}</p><p className="mt-8 font-bold">{job.salary}</p><div className="mt-2 flex items-center justify-between text-sm text-[#60736a]"><span>{job.type}</span><Link href={`/jobs/JOB-1000${index + 1}`} className="font-bold text-[#176b57]">View job</Link></div></article>)}</div></div></section>

      <section id="how-it-works" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-8"><div><p className="section-kicker">A CLEAR PROCESS</p><h2 className="section-title">From registration to joining, we stay with you.</h2><p className="mt-6 max-w-lg leading-7 text-[#60736a]">Candidates get an easy mobile-first path. Employers receive a verified recruitment workflow before vacancies go public.</p></div><ol className="grid gap-4 sm:grid-cols-2"><li className="process-step"><b>01</b><span>Register and complete your profile</span></li><li className="process-step"><b>02</b><span>Search jobs or submit your requirement</span></li><li className="process-step"><b>03</b><span>Verification and shortlist coordination</span></li><li className="process-step"><b>04</b><span>Interview, selection and joining support</span></li></ol></section>

      <section id="request" className="border-y border-[#dce3dc] bg-[#f5e9d2]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8"><div><p className="section-kicker text-[#bf4d2a]">FOR EMPLOYERS & CUSTOMERS</p><h2 className="section-title">Need reliable people for your site or home?</h2><p className="mt-3 max-w-2xl text-[#5c4d3c]">Share your manpower or facility requirement. Our team will review it before any job is published.</p></div><div className="flex flex-wrap gap-3"><a href="/employer/requirement" className="bg-[#bf4d2a] px-5 py-3 text-sm font-bold text-white">Submit a requirement</a><a href="/services/request" className="border border-[#bf4d2a] px-5 py-3 text-sm font-bold text-[#93391c]">Request a service</a></div></div></section>

      <footer id="contact" className="bg-[#102820] text-[#d8e7da]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8"><div><strong className="text-lg text-white">CG Job Care</strong><p className="mt-3 text-sm leading-6">Jobs, security, care and facility services for Raipur and Chhattisgarh.</p></div><div><strong className="text-white">Job seekers</strong><p className="mt-3 text-sm">Find jobs<br />Candidate registration<br />Track application</p></div><div><strong className="text-white">Businesses</strong><p className="mt-3 text-sm">Hire staff<br />Facility services<br />Employer requirement</p></div><div><strong className="text-white">Contact</strong><p className="mt-3 text-sm">Raipur, Chhattisgarh<br />Mon-Sat, 9:30 AM - 6:30 PM<br />WhatsApp and call support</p></div></div></footer>
    </main>
  );
}
