# Local production Lighthouse check

Audited 21 September 2026 with Lighthouse 13.5.0 and headless Chrome against a local `next start` build. `NEXT_PUBLIC_SITE_URL` was temporarily set to the matching localhost port for the audit. Scores vary with machine and network load; repeat on the production HTTPS domain before launch.

| Form factor | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 88 | 100 | 100 | 100 | 3.4 s | 140 ms | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0.8 s | 30 ms | 0 |

Additional public-flow checks: `/jobs` and `/services/pest-control` both scored 100 for accessibility and SEO after accessible select labels, review-star semantics and contrast fixes. `/candidate/register` scored 100 for accessibility; its SEO score is not a public-indexing target because `/candidate/` is disallowed in robots.

The final mobile audit transferred about 508 KiB. Earlier automatic carousel rotation could fetch multiple uploaded hero banners during a single audit; manual slide controls now load only the selected banner. The five bundled representative service images were converted to WebP at roughly 98–121 KiB each. Admin-uploaded images use Cloudinary automatic quality/format delivery.

The generated Open Graph/Twitter PNG routes, favicon, service WebP files, robots and sitemap returned HTTP 200. Homepage metadata, canonical URL and social image appeared in the initial `<head>` after disabling streamed metadata. The homepage rendered no known demo phone/email. The final raw local audit artifacts remain in this folder and are gitignored.

Lighthouse wrote valid JSON reports but Chrome's temporary-profile cleanup sometimes returned Windows `EPERM` after the audit. Scores above were read from the completed reports.

Before live SEO sign-off, set the final HTTPS `NEXT_PUBLIC_SITE_URL` **before the production build** so static robots and sitemap use the real domain. Supply approved branding and real contact details in Admin settings, confirm city/service coverage and work-gallery photos with the business, verify Search Console ownership, submit the live sitemap, and add the website to the verified Google Business Profile.
