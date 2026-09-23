import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { portalStore } from "@/lib/portal";
import { createPublicDisplayUrl } from "@/lib/storage";
import { getSiteUrl } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await portalStore.getSiteSettings();
  const faviconUrl = settings.faviconKey ? await createPublicDisplayUrl(settings.faviconKey).catch(() => null) : null;
  return {
    metadataBase: new URL(getSiteUrl()),
    title: settings.metaTitle || settings.companyName,
    description: settings.metaDescription,
    applicationName: settings.companyName,
    authors: [{ name: settings.companyName }],
    creator: settings.companyName,
    publisher: settings.companyName,
    category: "Jobs and Local Services",
    keywords: ["jobs in Raipur", "jobs in Chhattisgarh", "security guard service Raipur", "baby care Raipur", "caretaker Raipur", "housekeeping service Raipur", "pest control Raipur"],
    openGraph: { type: "website", locale: "en_IN", siteName: settings.companyName, title: settings.metaTitle || settings.companyName, description: settings.metaDescription, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${settings.companyName} jobs and local services` }] },
    twitter: { card: "summary_large_image", title: settings.metaTitle || settings.companyName, description: settings.metaDescription, images: ["/twitter-image"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="main-content" tabIndex={-1} className="flex min-h-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
