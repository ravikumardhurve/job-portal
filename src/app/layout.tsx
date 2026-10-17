import type { Metadata } from "next";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";
import { getGoogleSiteVerification, getSiteUrl } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const faviconUrl = settings.faviconKey ? await createPublicDisplayUrl(settings.faviconKey).catch(() => null) : null;
  const siteUrl = getSiteUrl();
  const googleSiteVerification = getGoogleSiteVerification();
  return {
    metadataBase: new URL(siteUrl),
    title: settings.metaTitle || settings.companyName,
    description: settings.metaDescription,
    applicationName: settings.companyName,
    authors: [{ name: settings.companyName }],
    creator: settings.companyName,
    publisher: settings.companyName,
    category: "Jobs and Local Services",
    keywords: ["jobs in Raipur", "jobs in Chhattisgarh", "security guard service Raipur", "baby care Raipur", "caretaker Raipur", "housekeeping service Raipur", "pest control Raipur"],
    openGraph: { type: "website", locale: "en_IN", siteName: settings.companyName, url: siteUrl, title: settings.metaTitle || settings.companyName, description: settings.metaDescription, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${settings.companyName} jobs and local services` }] },
    twitter: { card: "summary_large_image", title: settings.metaTitle || settings.companyName, description: settings.metaDescription, images: ["/twitter-image"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="main-content" tabIndex={-1} className="flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
