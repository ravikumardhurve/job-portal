import { SubmissionForm } from "@/components/submission-form";
import { SiteHeader } from "@/components/site-header";

export default async function ServiceRequestPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const requestedService = (await searchParams).service;
  const allowedServices = ["SECURITY", "BABY_CARE", "CARETAKER", "HOUSEKEEPING", "PEST_CONTROL", "MANPOWER", "OTHER"];
  const service = requestedService && allowedServices.includes(requestedService) ? requestedService : "";
  return <main className="min-h-screen bg-[#F5FAF7]"><SiteHeader /><div className="mx-auto max-w-2xl px-5 py-12"><p className="section-kicker mt-4 text-[#0F5C38]">FACILITY SERVICE REQUEST</p><h1 className="section-title">Request trusted help.</h1><p className="my-6 leading-7 text-[#4B5A52]">Security, care, housekeeping and facility requirements are managed separately from recruitment vacancies.</p><SubmissionForm action="/api/service-requests" buttonText="Request service" defaultValues={{ serviceType: service }} fields={[{ name: "customerName", label: "Your name", required: true }, { name: "mobile", label: "Mobile number", type: "tel", required: true }, { name: "serviceType", label: "Service type", type: "select", required: true, options: ["Security", "Baby Care", "Caretaker", "Housekeeping", "Pest Control", "Manpower", "Other"] }, { name: "staffRequired", label: "Staff required", type: "number" }, { name: "city", label: "City", required: true }, { name: "address", label: "Address", required: true }]} /></div></main>;
}
