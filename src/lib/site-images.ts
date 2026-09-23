import type { SiteSettings } from "@/lib/portal";
import { SERVICE_PAGES, type ServicePageSlug } from "@/lib/service-pages";
import { createPublicDisplayUrl } from "@/lib/storage";

export async function resolveServiceImages(settings: SiteSettings, slug: ServicePageSlug) {
  const fallback = SERVICE_PAGES[slug];
  const configured = settings.serviceAssets?.[slug];
  const heroImage = configured?.heroKey
    ? await createPublicDisplayUrl(configured.heroKey).catch(() => fallback.heroImage)
    : fallback.heroImage;
  const configuredGallery = await Promise.all((configured?.galleryKeys ?? []).map(async (key, index) => {
    const src = await createPublicDisplayUrl(key).catch(() => null);
    return src ? { src, caption: `${fallback.shortTitle} completed work ${index + 1}` } : null;
  }));
  const gallery = configuredGallery.filter((image): image is { src: string; caption: string } => Boolean(image));
  return { heroImage, gallery };
}
