import type { MetadataRoute } from "next";
import { portalStore } from "@/lib/portal";
import { SERVICE_PAGES } from "@/lib/service-pages";
import { getSiteUrl } from "@/lib/seo";

const baseUrl = getSiteUrl();

const staticRoutes: Array<{ path: string; changeFrequency: "daily" | "monthly"; priority: number; images?: string[] }> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
  { path: "/services", changeFrequency: "monthly", priority: 0.6 },
  { path: "/services/job-placement", changeFrequency: "monthly", priority: 0.8, images: [SERVICE_PAGES["job-placement"].heroImage, ...SERVICE_PAGES["job-placement"].gallery.map((image) => image.src)] },
  { path: "/services/security-services", changeFrequency: "monthly", priority: 0.8, images: [SERVICE_PAGES["security-services"].heroImage, ...SERVICE_PAGES["security-services"].gallery.map((image) => image.src)] },
  { path: "/services/baby-care", changeFrequency: "monthly", priority: 0.8, images: [SERVICE_PAGES["baby-care"].heroImage, ...SERVICE_PAGES["baby-care"].gallery.map((image) => image.src)] },
  { path: "/services/housekeeping", changeFrequency: "monthly", priority: 0.8, images: [SERVICE_PAGES.housekeeping.heroImage, ...SERVICE_PAGES.housekeeping.gallery.map((image) => image.src)] },
  { path: "/services/pest-control", changeFrequency: "monthly", priority: 0.8, images: [SERVICE_PAGES["pest-control"].heroImage, ...SERVICE_PAGES["pest-control"].gallery.map((image) => image.src)] },
  { path: "/locations", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await portalStore.listSitemapJobs();
  return [
    ...staticRoutes.map((route) => ({ url: `${baseUrl}${route.path}`, changeFrequency: route.changeFrequency, priority: route.priority, ...(route.images ? { images: route.images.map((image) => new URL(image, baseUrl).toString()) } : {}) })),
    ...jobs.map((job) => ({ url: `${baseUrl}/jobs/${job.id}`, lastModified: new Date(job.postedAt), changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
