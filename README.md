# CG Job Care & Facility Services

A Next.js App Router MVP for the public portal and the first recruitment and facility-service workflows.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

For the protected admin panel at `/admin`, create `.env.local` using `.env.example` and set a long random `ADMIN_SESSION_SECRET`.

## MongoDB Atlas

The application persists jobs, candidates, applications, employer requirements, service requests, announcements, website posts, and notifications in MongoDB. Copy `.env.example` to `.env.local`, replace `<db_password>` in `MONGODB_URI` with the Atlas database user's password, and restart `npm run dev`.

Do not commit `.env.local` or place an actual password in source files. On the first successful database connection, the application creates required indexes. Add real jobs and website content through the admin dashboard.

After restarting the server, verify Atlas connectivity with `http://localhost:3000/api/health`. It returns `{"status":"ok","database":"connected"}` only after the connection is working.

## Create the Super Admin

Set `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, and a password of at least 12 characters in `.env.local`. Then run:

```powershell
npm run seed:super-admin
```

The seed script stores a bcrypt password hash in MongoDB `users` and creates an account with the `SUPER_ADMIN` role. It is safe to run again: it updates the configured Super Admin credentials rather than creating a duplicate. Sign in at `/admin/login` using the configured email and password.

## Partner Admins and Business Fields

The Super Admin can create partner logins at `/admin/team`. Each partner account is assigned to exactly one business field:

- Jobs & Recruitment
- Security Services
- Baby Care & Caretaker
- Housekeeping
- Pest Control

Partner admins use the normal `/admin/login` page. Their dashboard and every protected admin API are scoped to the assigned field. They can only access matching jobs, applicants, interviews, employer requirements, and service requests. Website content, site settings, other partner accounts, and data from other fields remain restricted to central admins. Account creation and suspension are written to the audit log.

## Apply Database Schema

Apply the complete production collection schema, validators, indexes, unique constraints, and audit-log retention policy with:

```powershell
npm run setup:database
```

The setup is idempotent: it creates missing collections and indexes and updates validators for existing collections. Run it after configuring Atlas, before production deployment, and after schema changes.

For a production compile check:

```powershell
npm run build
```

## Cloudinary media storage

Website images and private candidate documents use Cloudinary. Create a free Cloudinary account, open **Dashboard > API Keys**, and add these server-only values to `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Restart `npm run dev` after changing environment variables. Admins can then upload logos, favicons, homepage banners, service hero images, and completed-work galleries at `/admin/settings`. Public site images use normal Cloudinary delivery URLs; candidate documents are uploaded as authenticated assets and are exposed only through the authorized download endpoint.

Never prefix `CLOUDINARY_API_SECRET` with `NEXT_PUBLIC_` or commit `.env.local`.

## Candidate documents and privacy

- Candidate documents are stored as authenticated Cloudinary assets and are served only through short-lived, authorized download links.
- Uploads use a document-type allowlist, MIME/format checks, size limits, candidate consent, retention-review dates, and access audit logs.
- Candidates can view, download, replace, and permanently delete their own documents from the profile.
- `/candidate/privacy` lets candidates update policy consent, export their stored data, submit a deletion request, and cancel a request that has not entered review.
- Central admins process deletion requests at `/admin/privacy-requests`. Completion removes private Cloudinary files before personal profile data is purged.
- Public policy pages are available at `/privacy` and `/terms`. Policy versions are defined in `src/lib/privacy.ts`.

Cloudinary malware scanning is an optional external add-on and is not enabled by this repository. The existing validation blocks unapproved file types; enable and test an account-level malware-scanning provider separately if the production contract requires antivirus inspection.

## Admin operations

- Employer requirements have a dedicated searchable workflow page with status, assignment, follow-up date and internal notes.
- Interviews support filters, complete detail editing, rescheduling, cancellation reasons and outcome updates.
- Dashboard analytics compare business categories and activity for a selected date range.
- Role-scoped CSV reports are available for candidates, applications, jobs and service requests.
- Super Admin can review searchable audit history. Admin login, content, document and workflow actions are recorded.
- Admin accounts track login count and last login, and every admin can change their own password from `/admin/account`.
- Candidate controls include block reasons, internal notes and confirmed personal-data deletion with private-file cleanup.
- Jobs support draft duplication, confirmed archiving and automatic expiry when the application deadline passes.
- Service requests support staff/vendor assignment, scheduled date/time and internal execution notes.

Real email delivery uses the Resend HTTP API. Configure these server-only variables before sending an Email-channel notification:

```env
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=CG Job Care <notifications@your-verified-domain.com>
```

SMS and WhatsApp channels remain disabled until separate provider credentials are configured.

## Implemented flows

- Public, responsive CG Job Care home page with job search presentation, jobs, services, and employer/customer actions.
- Candidate registration at `/candidate/register`, including unique 10-digit mobile validation.
- Employer manpower requirement intake at `/employer/requirement`. New requirements are saved with `NEW` status and are not public jobs.
- Facility lead intake at `/services/request` for security, care, housekeeping, pest control, and manpower requests.
- Typed backend contracts and API endpoints for jobs, candidates, applications, employer requirements, and facility requests.
- The API explicitly exposes only `PUBLISHED` jobs and rejects duplicate applications for the same candidate and job.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/jobs?q=guard&city=Raipur` | Search published jobs only |
| `POST` | `/api/candidates` | Start candidate registration |
| `POST` | `/api/applications` | Submit `{ candidateId, jobId }` |
| `POST` | `/api/employer-requirements` | Capture a private employer requirement |
| `POST` | `/api/service-requests` | Capture a facility service lead |

## Current data layer

The application uses MongoDB through the native driver. `src/lib/portal.ts` currently acts as the data-access and business-rule layer for jobs, candidates, applications, interviews, content, notifications, employer requirements, service requests, and site settings. Site images use Cloudinary delivery URLs, while candidate documents use authenticated Cloudinary assets and authorized download URLs.

Run `npm run setup:database` before production deployment to apply validators and indexes. The application performs a lightweight runtime index check. Sample jobs and content are no longer seeded; unchanged historical sample records are excluded from public pages and the sitemap. Review and remove or replace them from the admin dashboard.

## Production checklist

- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain, then verify canonical, Open Graph, `/robots.txt`, and `/sitemap.xml` responses on that domain.
- Add real phone, email, office address, hours, and Google Business Profile URL in Admin → Website settings. Known demo contact values are hidden from public pages and structured data.
- Replace the built-in CG Job Care brand mark and favicon with the client's approved logo through Admin → Website settings. The five bundled service images are original representative visuals, not completed-work evidence. Upload approved real project photos through Admin → Website → service assets before showing an old-work gallery.
- Review each service's city coverage and actual operations with the client. Pages accept enquiries from major Chhattisgarh cities while explicitly stating that deployment depends on verification.
- Set `GOOGLE_SITE_VERIFICATION` to the actual Search Console token and verify ownership. Submit `https://YOUR_DOMAIN/sitemap.xml` in the verified Search Console property after launch. Claim/verify the Google Business Profile, add the production website URL there, and put its public profile URL in Admin settings. These account actions require owner access.
- Check a public production URL with Google Rich Results Test and social-sharing debuggers after deployment. Run mobile and desktop Lighthouse on production, investigate field data and record scores before sign-off.
- Review the published Privacy Policy, Terms, retention period, and business contact details with the operating company before launch.
- Configure production secrets, backup/restore checks, monitoring, and alerting.
- Add stronger login verification and CAPTCHA or equivalent bot protection where production traffic requires it.
- Add SMTP, SMS, and WhatsApp providers behind notification adapters.
- Activate a malware-scanning service if antivirus inspection of uploaded documents is part of the production requirement.

## Project structure

```text
src/app/                  Pages and route handlers
src/app/api/              Full-stack REST endpoints
src/components/           Reusable browser components
src/lib/portal.ts         Domain types, business rules, and MVP repository
```This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
