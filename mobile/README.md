# CG Job Care — React Native app

Expo SDK 57 + React Native, with candidate and admin workspaces. This is a native UI, not a WebView wrapper. The existing Next.js project remains the backend; the app uses `/api/mobile/*` and the same MongoDB records.

## Run locally

1. Start the portal from the repository root: `npm run dev -- --hostname 0.0.0.0`.
2. Inside `mobile/`, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to your computer's LAN URL, for example `http://192.168.1.100:3000`. Do not include `/api`. On Android Emulator use `http://10.0.2.2:3000`. A physical phone cannot reach your computer using `localhost`.
3. Run `npm ci` inside `mobile/`, then `npm start`.
4. Open the QR code with an Expo Go version compatible with SDK 57, or use a development build. Phone and computer must share the network. If blocked, allow the relevant development ports through your firewall; do not expose your database.

Restart Expo after changing `.env`. The existing backend MongoDB configuration must be valid. Do not copy database, Cloudinary or session secrets into this app: `EXPO_PUBLIC_*` values are bundled publicly.

The local ignored `.env` is configured for the verified LAN address `http://192.168.1.2:3000`. Update it when your computer's IP changes. Without the environment setting, the app shows a configuration error rather than demo jobs.

`app.config.js` validates the public API URL at startup and includes only that setting in `extra.apiUrl`. The request client uses `EXPO_PUBLIC_API_URL` first and this Expo manifest value as a fallback when Expo Go's JavaScript environment value is missing. The config can read `mobile/.env` if the running server has not loaded it yet; it never reads the parent backend environment file. Missing or malformed URLs now fail at startup. After changing config, restart Metro with `npm start -- --clear --lan`, then close and reopen the project in Expo Go to load the new manifest. A refresh of an already-open screen may still use the previous manifest.

### Browser preview

Run `npm run web -- --clear` inside `mobile/` (stop any previous Metro process first). The web dependencies are included. The portal backend must run separately on port 3000; Metro on port 8081 serves only the app.

Browser sessions are memory-only: refreshing or closing the page requires signing in again. Native sessions still use SecureStore. Browser confirmation dialogs support logout, admin status changes and meeting links.

In backend development mode, CORS allows Expo on `http://localhost:8081`, `http://127.0.0.1:8081` and port 8081 on the backend request's hostname. For other ports or a deployed web app, set `MOBILE_WEB_ORIGINS` in the **backend** environment to comma-separated exact trusted origins, for example `https://app.example.com`. Restart the backend after changing it. No wildcard origins or browser cookies are used by the mobile API. Production exports require an HTTPS backend URL; use the development server for local HTTP testing.

## Implemented

- Guest job search, city/type filters, server pagination and job details.
- Candidate registration with policy/adult consent, login, secure session restore and logout.
- Apply, saved jobs, application history and interview information.
- Native address/job-preference editing sufficient to reach the existing 55% application threshold.
- Service enquiry form with reference-number confirmation (not a confirmed booking).
- Admin/partner login, dashboard, searchable paginated tables for jobs, applications, candidates, interviews, services and employer requirements.
- Admin job draft creation; job, application, interview, service and requirement status updates with confirmation and existing business-field scope checks.
- Loading, empty, network-error/retry states, Android back handling and safe-area layout.

## Native page navigation

The app now has a Home page, separate candidate/admin workspaces, bottom tabs, an **All pages** menu and Android back history. Signing in returns you to the requested candidate page; restoring a session opens the appropriate dashboard. Admin lists remain horizontally scrollable tables on phones.

Public pages: Home, jobs and job details, services and individual service details (FAQs, gallery and moderated reviews), service enquiry, employer staffing requirement, city directory, About, Contact, Privacy Policy and Terms. City links open filtered job searches. Employer/review submissions use the existing server workflow; they do not instantly publish jobs or reviews.

Candidate pages: dashboard, saved jobs, applications, interviews, full profile (basic contact, address, education, experience and job preference), private documents, notifications and privacy centre. Documents use private signed Cloudinary uploads, server-side file verification, download links and delete/replace confirmations. The privacy centre supports consent renewal, personal data export and submitting/cancelling a deletion request.

Admin pages: dashboard, jobs, applications, candidates, interviews, service requests, employer requirements, reports, review moderation, audit logs, partner team management, account/password, privacy-request review and website text/contact settings. Existing records link directly to native job editing, candidate/private-document verification and interview scheduling. Record forms support interview rescheduling/cancellation, staff/vendor assignment and employer follow-up notes. Banners and service hero/gallery images can be uploaded, replaced, removed and reordered from the media page. Backend scopes and role checks apply independently of menu visibility.

## Remaining release work

Final irreversible processing of account-deletion requests remains in the web administration workflow; mobile admins can review or reject requests. Report CSV export, image captions, push notifications, offline writes, password recovery and app-store publishing are not implemented. Native personal-data export uses the share sheet; browser preview downloads JSON. A native page does not imply every advanced website action has identical parity. Run the role-based acceptance checks below before release; no production accounts or records were created for testing. Concurrent media editors can still overwrite settings updates, and abandoned uploads may require storage cleanup.

## Authentication & security

Mobile tokens are random opaque values; only their SHA-256 hashes are stored in `mobileSessions`. They expire after 8 hours (admin) or 30 days (candidate). Logout deletes the session. Password changes, blocked/deleted candidates and suspended admin accounts invalidate access on the next request. Native tokens are stored with Expo SecureStore and browser-preview tokens only in memory; they are never placed in website URLs, logs, localStorage or AsyncStorage.

The new endpoint validates request fields, restricts candidate/admin routes separately and returns allowlisted candidate fields. Mobile login/registration uses per-identifier MongoDB throttling (12 attempts per 15-minute bucket). This is not comprehensive bot protection: add infrastructure-level IP limits, abuse monitoring and operational alerts before public launch. Existing web authentication behavior is unchanged.

`mobileSessions` and `mobileAuthAttempts` indexes are created lazily, including BSON-Date TTL indexes. The backend database user needs the same create-index privileges already required by the portal. No destructive schema/setup script is needed for these additions.

## Verify

From `mobile/`:

```sh
npm run typecheck
npm run export:android
npm run export:web
```

From the repository root:

```sh
node scripts/check-mobile.cjs
node scripts/check-mobile-web.cjs
node scripts/check-mobile-navigation.cjs
node scripts/check-mobile-public.cjs
node scripts/check-mobile-candidate.cjs
node scripts/check-mobile-admin-pages.cjs
node scripts/check-mobile-assets.cjs
node scripts/check-mobile-records.cjs
npx tsc --noEmit --incremental false
node scripts/check-admin-ui.cjs
```

Isolated checks mock the database and do not test live integration or real-device layout. Test a disposable candidate plus central and restricted partner admin on staging before release. Confirm signup → profile → apply → admin shortlist → candidate update; saved jobs; service enquiry; logout; expired/blocked sessions; keyboard layouts and horizontal tables at 320–430px widths.

## APK / store build

Dependency audit at implementation time reported 10 moderate findings in the Expo tooling dependency chain (`xcode` → `uuid`), and no high/critical findings. The suggested automatic fix would downgrade Expo to SDK 46, so it was not applied. Review upstream fixes and rerun the audit before release; no unverified major-version overrides were added.

Use an HTTPS production or staging `EXPO_PUBLIC_API_URL` for any release APK. Release code rejects cleartext HTTP. Configure that variable in your EAS build environment, choose final identifiers/branding, then:

Deploy the updated Next.js backend (including `/api/mobile/*`) to that URL before connecting the app. A previously deployed copy of the website without these routes cannot provide mobile login or admin data.

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

`eas.json` contains an internal APK profile and a production profile. EAS requires your account/project configuration and may have build quotas or costs. No cloud build, signing, paid service or store submission has been initiated. An Android JS export is not an installable APK. Final iOS bundle ID and store credentials must be supplied before an iOS release.

References: [Expo project setup](https://docs.expo.dev/get-started/create-a-project/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
