import type { Candidate } from "@/lib/portal";

export type SafeCandidate = Omit<Candidate, "passwordHash">;

export const CHHATTISGARH_DISTRICTS = ["Raipur", "Bhilai", "Durg", "Bilaspur", "Rajnandgaon", "Korba", "Raigarh", "Jagdalpur"];

export const SALARY_BANDS = [
  { value: "", label: "Any salary" },
  { value: "0-10000", label: "Under 10,000" },
  { value: "10000-15000", label: "10,000 - 15,000" },
  { value: "15000-20000", label: "15,000 - 20,000" },
  { value: "20000-30000", label: "20,000 - 30,000" },
  { value: "30000-", label: "30,000+" },
];

export const SERVICE_IMAGES = {
  jobPlacement: "/images/services/job-placement.webp",
  security: "/images/services/security-services.webp",
  care: "/images/services/baby-care.webp",
  pestControl: "/images/services/pest-control.webp",
  housekeeping: "/images/services/housekeeping.webp",
};

export function getCategoryImage(category: string): string {
  const key = category.toLowerCase();
  if (key.includes("security")) return SERVICE_IMAGES.security;
  if (key.includes("health") || key.includes("care")) return SERVICE_IMAGES.care;
  if (key.includes("house") || key.includes("clean")) return SERVICE_IMAGES.housekeeping;
  if (key.includes("pest")) return SERVICE_IMAGES.pestControl;
  return SERVICE_IMAGES.jobPlacement;
}
