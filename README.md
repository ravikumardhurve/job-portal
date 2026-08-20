# CG Job Care & Facility Services

A Next.js App Router MVP for the public portal and the first recruitment and facility-service workflows.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production compile check:

```powershell
npm run build
```

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

The MVP repository in `src/lib/portal.ts` uses process memory to make the workflows runnable immediately. It resets after a server restart and must be replaced before deployment with MongoDB or PostgreSQL plus an ORM/repository implementation.

The data model types already separate job status, application history, employer requirements, facility requests, and candidate verification status. The next backend phase should add persistent models for users, documents, interviews, placements, notifications, audit logs, roles, and permissions.

## Production checklist

- Add password hashing, mobile/email authentication, sessions, role-based authorization, rate limiting, CSRF protections where required, and audit logs.
- Store resumes and identity documents in private S3/R2 buckets using signed URLs. Never expose Aadhaar or PAN files publicly.
- Add database uniqueness constraints for candidate mobile, optional email, and `(candidateId, jobId)` applications.
- Protect the future admin, recruiter, candidate, and employer dashboards with server-side authorization.
- Add SMTP, SMS, and WhatsApp providers behind notification adapters.
- Add validation, file upload MIME/size checks, CAPTCHA/honeypot protection, observability, backups, and deployment secrets.

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
