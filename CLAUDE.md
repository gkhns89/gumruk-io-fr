# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`gumruk-io-fr` is the React SPA for **Gümrük.io**, a SaaS for Turkish customs brokerages
(gümrük müşavirliği): import/export declaration tracking, bonded warehouse (antrepo),
courier document runs, live container/air-waybill tracking ("G-Radar"), agency agreements
(vekalet), subscriptions and reporting.

The backend is a **separate Spring Boot repo**, `gumruk-io-back` (parts of it are wired in
as additional working directories in `.claude/settings.local.json`). This repo contains no
server code — every capability here is an HTTP call into that API.

## Commands

```bash
npm run dev       # Vite dev server, bound to 0.0.0.0 (--host) for LAN testing
npm run build     # production build into dist/
npm run lint      # ESLint flat config over the repo
npm run preview   # serve the built dist/
npm run i18n:check  # tr.js and en.js must carry the same keys
```

There is **no test framework in this project** — no Vitest/Jest, no test files. Don't
invent a `npm test`; verify changes by running the app.

Deployment is Vercel and automatic, in two lanes. Pushing to `staging` deploys the Preview
build behind `staging.gumruk.io` (Vercel Authentication in front, `X-Robots-Tag: noindex`
from `vercel.json`); pushing to `main` ships production. Work goes feature branch →
`staging` → `main`, and the backend repo follows the same flow (`staging` → `master`).

`VITE_API_BASE_URL` is set per Vercel environment (Production → `api.gumruk.io`, Preview →
`api-staging.gumruk.io`). Vite bakes it in at build time, so changing it needs a redeploy.
If it is missing, `axios.js` falls back to the production API only on the production
hostnames; every other build talks to staging. `vercel.json` also holds the SPA rewrite
(everything → `/index.html`) and the immutable cache header for `/assets/*`.

Production builds drop `console.log`/`info`/`debug` during minification (esbuild `pure` in
`vite.config.js`); only `warn` and `error` survive. Don't rely on `console.log` to debug
staging or production, and never log tokens or raw API payloads.

## Stack notes that bite

- **Tailwind v4**, CSS-first. The design tokens live in the `@theme` block of
  `src/index.css`, not in `tailwind.config.js` (that file is a near-empty leftover).
  Dark mode is a **class** variant declared in CSS:
  `@custom-variant dark (&:where(.dark, .dark *))` — `ThemeProvider` toggles `.dark` on
  `<html>`. Adding a color means adding a `--color-*` var to `@theme`.
- **React 19 + React Router 7**, plain JSX (no TypeScript, no path aliases — all imports
  are relative).
- ESLint rule to know: `no-unused-vars` ignores `^[A-Z_]` identifiers, so unused
  constants pass but unused lowercase locals are **errors**.

## Architecture

### Provider stack (`src/main.jsx`)

`BrowserRouter → ThemeProvider → AuthProvider → PaymentRestrictionProvider → FeatureFlagProvider → App`
plus a global `ToastContainer`. The order matters: `PaymentRestrictionProvider` and
`FeatureFlagProvider` read `AuthContext` directly.

### Release flags

A feature being updated can run for chosen brokerages first. Flags are declared in the
backend (`FeatureFlagKey`) and mirrored in `src/utils/featureFlags.js`; SUPER_ADMIN sets each
one to OFF / PILOT / ON and picks pilot brokers on `/management/feature-flags`.
`FeatureFlagProvider` loads `/feature-flags/me` once per login; read it with
`useFeatureFlags()` → `hasFeature(key)` to branch, `isPilotFeature(key)` to show
`<NewFeatureBadge />`. In PILOT the backend also turns a flag on for client users linked to a
pilot broker. The frontend only reveals UI — flagged endpoints check the flag themselves and answer 400
`FEATURE_DISABLED` when it is off. Services pass such errors to `reportIfFeatureDisabled(error)`
(`src/utils/featureFlags.js`), which makes `FeatureFlagProvider` reload the flags quietly; callers skip
the error toast, so a flag switched off mid-session just makes its UI disappear.
When a flag goes ON for good, delete the old code path, the constant and the backend key.

### Routing (`src/App.jsx`)

**Every route is `lazy()`-loaded, and that is load-bearing.** Statically importing a page
here pulls its whole dependency tree (including `maplibre-gl`) into the main bundle, which
is what visitors to the public landing page download before ever logging in. When adding a
page, add a `lazy(() => import(...))` line — never a static import. A single `<Suspense>`
wraps all routes.

Three route wrappers:

- `ProtectedRoute` — redirects to `/login` when unauthenticated. Optional `requiredRole`
  takes **a string or an array**; a mismatch bounces to `/dashboard`.
- `PublicRoute` — only `/login`; redirects authenticated users to `/dashboard`.
- Nothing — the marketing/legal routes (`/`, `/kullanim-kosullari`, `/gizlilik`) are
  deliberately unwrapped so search engines and logged-in users both see them.

Route-level roles are coarse; several pages do finer role checks internally (e.g.
`/company-settings` is open to any authenticated user at the route and gates inside).

### Auth

JWT in `localStorage` under `token`, user under `user`. `src/utils/tokenManager.js` owns
all reads/writes plus client-side JWT decoding and expiry checks (30 s clock-skew buffer).
`AuthProvider` re-checks validity on a 30-minute interval and force-logs-out on expiry.
Token lifetime is a backend/env concern — the Settings page only displays it.

**There is no self-service password reset, and no `/forgot-password` route to add one to.** The
product sends no e-mail at all, so a reset link has nothing to travel on; the backend's half-built
flow was deleted on 19.09.2026. A forgotten password is fixed by an administrator through
`userService.setUserPassword` — `SetPasswordModal` on the employees page, `ClientAccountModal` on
the clients page — which closes every session the target has open. The login
page's "Şifremi Unuttum?" is a disclosure that says so, not a link — don't turn it back into one
without a mail transport on the server first.

### API layer (`src/api/`)

One `*Service.js` module per domain, all built on the shared `axiosInstance` from
`src/api/axios.js`.

**The universal convention: services never throw.** Every method returns
`{ success: true, data }` or `{ success: false, error: '<user-facing message>' }`,
logging through `logError()` on the way. The service's own messages (fallbacks, success and
validation texts) come from `t('api.*')`, so they are Turkish or English by the user's language;
text the backend sends is passed through as is. Callers branch on `result.success`; helpers
`handleApiResponse()` / `handleError()` in `src/utils/errorUtils.js` do the toast for you.
Follow this shape in new services — code all over the app assumes it. (A handful of
`paymentService` methods break the rule and return raw data / throw; those callers wrap
them in `try/catch` themselves.) When a form maps server errors to its fields, the failure also
carries `code` and `details` from the envelope (`companyService.createBrokerCompany` →
`CreateBrokerCompanyModal`: `COMPANY_NAME_EXISTS`, `USER_EMAIL_EXISTS`, ...). A request whose body holds
a password must not hand the raw axios error to `logError()` (dev logs it with `config.data`); pass
`{ message, response: { status, data } }` instead.

Server error bodies are `{ error, message, code, details? }`: `message` is the user-facing
text, `error` repeats it for older callers (except `PAYMENT_RESTRICTION`, where `error` is
the code), `code` is a stable constant (`VALIDATION_FAILED`, `FORBIDDEN`, `INTERNAL_ERROR`, ...)
and `details` maps field → message on validation errors. Controllers that still build their
own `Map.of("error", ...)` send only `error`. Read the text with `getApiErrorMessage()` from
`errorUtils.js`, which handles both shapes. Some services branch on status: 429 = quota,
409 = conflict (e.g. sector in use), 403 = no permission.

`axios.js` resolves the base URL itself: in `PROD` from `VITE_API_BASE_URL` (falling back
to `https://api.gumruk.io/api`); in dev, `localhost:8080` for local access but
`http://<current-host>:9090` when reached over LAN.

Interceptors handle three things globally, so pages shouldn't re-implement them:

- **Missing token / logout in flight** → request cancelled with `skipToast`, silently.
- **401** → clears storage, toasts a reason derived from the `x-auth-error` header, and
  hard-redirects to `/login` after 200 ms. Guarded by an `isLoggingOut` latch so a burst
  of parallel 401s produces one logout.
- **403 with `error: "PAYMENT_RESTRICTION"`** → dispatches a `paymentRestrictionDetected`
  window event; `PaymentRestrictionModalController` in `App.jsx` renders the warning modal.

Per-request escape hatches: pass `{ silentOnError: true }` or `{ silentOn500: true }` in
the axios config to keep expected failures (missing avatars, flaky endpoints) out of the
console.

### Roles and gating

Roles: `SUPER_ADMIN`, `BROKER_ADMIN`, `BROKER_USER`, `CLIENT_USER` (on `user.globalRole`).

`src/components/layout/menuConfig.js` is the **single source of truth for the management
menu** — `Sidebar` (desktop) and `MobileMenu` both read it, with `roles` plus an optional
`condition(user)` predicate. Add menu entries there, not in either menu component.

`/management/scheduled-jobs` (`ScheduledJobsPage`, SUPER_ADMIN) is the read-only view of the
backend's scheduled jobs: last outcome, last run, last clean run, next expected run, record
counts, consecutive failures and the last error summary, with troubled jobs sorted first. It
renders `GET /api/admin/scheduled-jobs` and has no actions — there is deliberately no "run
now". The job's technical name (`Class.method`) is never shown as a label: the page maps it to
`scheduledJobs.jobs.*`, mirroring `ScheduledJobLabels` on the server, and falls back to the raw
name for a job it does not know. The `stale` flag is computed server-side with the same rule as
the SUPER_ADMIN alert, so page and notification can never disagree.

Payment restriction is a second, orthogonal gate. `PaymentRestrictionProvider` polls
`/payment-restriction/status` every 5 minutes (skipped for `SUPER_ADMIN` and `CLIENT_USER`) and
exposes `isWarning` / `isWriteBlocked` / `isFullReadOnly` via `usePaymentRestriction()`.
Pages combine it with role checks — the established pattern is
`const isCreateBlocked = canCreate && (isWriteBlocked || isFullReadOnly)`.

### Layout and scrolling

`MainLayout` wraps every in-app page (24 of them) and owns the scroll container
`#main-scroll-area` — **the window itself does not scroll inside the app**. Consequences:

- The global `<ScrollToTop />` only affects window scroll, i.e. the public pages.
  In-app "scroll to section" behaviour must target `#main-scroll-area`.
- `Sidebar` broadcasts width changes as a `sidebarStateChanged` window CustomEvent and
  persists `sidebarMode` in `localStorage`; `MainLayout` and some pages listen for it
  rather than sharing state through context.

### Shared UI conventions

- **Confirmations**: `confirmDialog({ title, message, intent })` from
  `src/utils/confirmDialog.js` — an imperative promise-based replacement for
  `window.confirm`. Use it instead of adding another confirm modal + state triple.
- **Anything that moves money asks first, and never reloads the page.** A checkbox or toggle
  that spends balance (e.g. "Bakiye kullan" on an add-on) records the intent and opens a
  `confirmDialog` naming the amount; nothing is charged until the user confirms. After a charge,
  toast the amount and re-run the page's existing `load()` — `window.location.reload()` throws
  the toast away before it can be read, and the user is left guessing what happened.
- **Form modals guard unsaved changes**: add/edit modals (transactions, warehouse, cargo) call
  `useUnsavedChangesGuard({ values, onClose, enabled })` from `src/hooks/` and route the backdrop,
  X, Cancel and their document ESC handler through the returned `requestClose` — never `onClose`
  directly. A dirty form opens `unsavedChangesDialog()` (`src/utils/`: keep / discard, plus draft
  when `onSaveDraft` is passed) and warns on `beforeunload`; `enabled: !isReadOnly` for read-only
  views. `values` is a `useMemo` of what the user can change: `formData`, free-text search terms
  that are saved as typed, notes. Leave out option lists, loading flags and derived UI. Pickers
  count by id, their search text only while nothing is selected (`clientSearch: formData.clientCompanyId ? '' : clientSearchTerm`),
  because loaders rewrite the selected name. The baseline follows `values` until the user's first
  key or click, so async prefill isn't a change. Success paths close through `onSuccess`, not the guard.
- **New-record drafts** (`DRAFTS` flag, BROKER_ADMIN / BROKER_USER only — `canUseDrafts()` in
  `src/utils/drafts.js`): new Add-style form modals use the guard **plus** `useRecordDraft` (`src/hooks/`).
  Its `saveDraft` goes to the guard's `onSaveDraft` and a footer `SaveDraftButton`; `getSnapshot` returns
  `{ payload, label }` — everything needed to rebuild the form (`formData`, search terms, number display
  texts). A draft reopens as `initialDraft`: seed the `useState` initializers from `readDraftPayload()` /
  `mergeDraftFields()` (not async setters, so dropdowns stay closed) and call `discardDraft()` on a successful
  create. Server side is `src/api/draftService.js`; bump `DRAFT_SCHEMA_VERSION` if a snapshot's shape changes.
  The G-Radar preview (credit-bound tracking id) is never part of a draft. Pages list drafts with
  `components/drafts/DraftsControl` (header button + panel, also opened by `DRAFT` notifications via
  `location.state.openDrafts`); work days/hours and the purge time live in `WorkSettingsCard` on
  `/company-settings`.
- **Pending changes on an existing record** (`DRAFTS`, phase 3): the three Edit modals pass `targetId` (the
  record's id) and `baseUpdatedAt` (its `updatedAt` when the modal opened) to `useRecordDraft`, and their
  snapshot carries a `base` block — the record as the modal found it, built by the module's `*RecordToPayload`.
  **A pending-change draft is a delta, not a snapshot.** The payload is a whole form, but only the fields that
  differ from `payload.base` belong to the drafter; applying means *the record as it is now, plus those fields*.
  `buildPendingChange()` (`src/utils/draftDiff.js`) does the whole calculation in one place — the delta paths, the
  payload to apply (`recordToPayload(record)` overwritten with the delta), the rows to show, the true conflicts and
  the fields someone else moved that the draft will not touch — and the comparison modal, the banner and the form
  prefill all read it, so what is shown and what is written can never drift. Drafts taken before this (no
  `payload.base`) keep the old whole-form behaviour and say so in the UI (`drafts.pending.legacyNote`).
  So: never apply `draft.payload` directly, and never re-anchor `payload.base` to anything but the record the form
  was seeded from — saving a draft again re-takes both from the modal's own record, which is what keeps the delta
  intact.
  **Each module owns one file** — `transactionDraftFields.js`, `warehouseDraftFields.js`, `cargoDraftFields.js` next to
  its modal — holding `create*FormData(record)`, `build*UpdatePayload(formData, …)`, the comparison field list
  (`key`, `label` — the same `t()` key the form's label uses — and an optional `format`) and the
  `*RecordToFields` / `*PayloadToFields` / `*RecordToPayload` trio. The Edit modal and the "Uygula" action both go
  through them, so the two can never send different bodies; add a new form field in that file, not inline. A value
  the body reads from somewhere other than `formData` (warehouse takes sender/warehouse/carrier from the search
  boxes) must be in `*RecordToPayload` too, or the delta would miss it.
  Lists get their badges from one `GET /drafts/pending` per module (`usePendingDrafts`), never per row;
  `PendingChangeBadge` sits in the row and opens `PendingChangeModal`, which diffs with
  `diffDraftFields()` (`src/utils/draftDiff.js` — comparison is on the rendered text, so `1500` and `"1500.00"`
  match; id-bearing fields are wrapped in `idValue(id, name)` so they compare by id and display by name). The pages
  resolve that record live from the loaded list, because it is the base the delta is written onto.
  The red "review before applying" state and its checkbox appear **only on a true conflict** — the drafter and
  someone else changed the same field (or the draft is a legacy one). A record that merely changed elsewhere gets a
  calm informational line instead.
- **The Edit modal opens on your own draft** (`DRAFTS`, phase 4): `useEditDraftPrefill` (`src/hooks/`) finds the
  user's **own** pending draft for that record (`mine !== false` — someone else's never prefills), loads **the
  record as it is now with that draft's delta applied** into the form with the module's `*PayloadToFormData` (so
  untouched fields show fresh values, not the stale snapshot) and hands the draft id to `useRecordDraft` so saving a
  draft again updates the same one. Each Edit modal supplies two imperative functions: `applyDraftPayload(payload)` (form
  state, search texts, selected ids, display numbers re-formatted in the current locale — dropdowns are never
  opened) and `resetFormToRecord()`. `EditDraftBanner` sits at the top of the form: calm by default with "Orijinali
  yükle" / "Karşılaştır" / "Taslağı sil"; it turns red only on a true conflict (`prefill.hasConflict`), names the
  fields both of you changed and pushes "Karşılaştır" forward — saving stays allowed, it is the user's deliberate
  overwrite. Other fields the record picked up meanwhile are a quiet line, not a warning. "Karşılaştır"
  reuses `PendingChangeModal` with `readOnly` (no apply/delete there: saving the form is the apply). A successful
  update calls `discardDraft()`, which deletes the draft and drops the badge; a 409 `CONCURRENT_UPDATE`
  (`isConcurrentUpdate()` in `utils/drafts.js`, on the `status`/`code` the update services now pass through) keeps
  the draft and flips the banner to the warning. The row badge and "İncele" stay as they were, and they remain the
  only way a BROKER_ADMIN reviews someone else's draft.
- **Passwords typed for someone else** (add employee, set password, client account): the password
  inputs carry `autoComplete="new-password"` and the e-mail input `type="email"` + `autoComplete="off"`.
  Without them the browser treats the form as a sign-in and fills in the admin's own saved password,
  so the account opens with a password nobody knows. Use `components/common/NewPasswordFields`
  (password + confirmation, show/hide, "Parola oluştur"); the rules (8 characters, at most 72 UTF-8
  bytes) live in `utils/passwordUtils.js` and mirror the backend `PasswordPolicy`. An admin sets
  another user's password only with `userService.setUserPassword` (`PUT /users/{id}/password`, which
  closes that user's sessions); `PUT /users/{id}` rejects a `password` field. Never log these payloads.
- **Toasts**: `showSuccess/showError/showInfo/showWarning` from `src/utils/toastUtils.js`.
  User-facing errors should go through `sanitizeError()` (via `handleError`), which
  suppresses anything containing credential-ish keywords, stack traces, or >150 chars.
- **Authenticated images**: API image endpoints need the bearer token, so `<img src>`
  can't hit them directly. Use `<AuthedImage url="/users/5/avatar" />`, which fetches a
  blob via axios and revokes the object URL on unmount; `imageUtils.js` memoizes 404s so
  a missing avatar isn't re-requested on every mount, and handles WebP downscaling on
  upload.
- **Domain enums** (statuses, gates, vehicle types, currencies, delivery types, balance
  transaction types) plus their Tailwind class bundles and `getX(value)` lookups all live
  in `src/utils/constants.js`. Add new statuses there, not inline in components. Lookups
  return `null` for unknown values on purpose — never mislabel one as a known value. But
  **don't fall back to the raw constant on screen either**: a backend leak then shows up
  verbatim (that is how `SHIPSGO_CREDIT_PURCHASE` appeared in Balance Movements). Give the
  enum a `getXLabel()` that returns a translated generic label for unknown values, like
  `getBalanceTransactionLabel()`, and keep the raw value in a `title` attribute.

### Language and i18n

The product UI and most code comments are **Turkish**; commit messages are English,
imperative mood ("Move the G-Radar column next to the consignment number"). Match the
surrounding file.

**The UI is being translated to English** (decision 12.09.2026), screen by screen.
`src/locales/` is a small home-grown layer: `t('gates.yellow')` reads `tr.js` / `en.js`,
the choice lives in `localStorage` under `language`. The rules:

- **New or touched UI text goes through `t()`**, with the key added to **both** `tr.js` and
  `en.js`. `npm run i18n:check` fails when the dictionaries' keys differ.
- `t()` is not React state. `setLanguage()` saves the choice and **reloads the page**, so
  calling `t()` anywhere — render, module scope, constants — always yields the current language.
- **Modules in the entry chunk import `t` from `src/locales/runtime.js`, never from `src/locales`.**
  That covers `axios.js`, `errorUtils.js` and anything the providers in `main.jsx` pull in
  (`authService`, `userService`, `paymentService`, `featureFlagService`). A static import of
  `src/locales` there puts both dictionaries into the bundle every landing-page visitor downloads
  (+40 KB gzip). `runtime.js` is a bridge the dictionary module registers with when it loads —
  lazy pages import `src/locales` themselves, and `main.jsx` loads it before the first render when
  a session token exists. After a build, check that no dictionary text is in `dist/assets/index-*.js`
  referenced by `dist/index.html`.
- `constants.js` items keep a `labelKey`; their `label` / `displayName` / `description` are
  getters over `t()`, so callers read `option.label` as before. Don't add literal labels there.
- Menus come from `menuConfig.js` (`HOME_ITEM`, `getGeneralMenuItems(user)`, `SUPPORT_ITEMS`,
  `MANAGEMENT_ITEMS`) for both `Sidebar` and `MobileMenu`.
- Format dates and numbers with `getCurrentLocale()`, not a hard-coded `'tr-TR'` (many old
  call sites still have it).
- The language picker (`LanguageSelectCard` on the profile page) is **open to every user** since
  13.09.2026 — every screen is translated, so new UI text must never be added as a literal. Text
  produced by the backend (error messages, notification titles) is still Turkish.

**Icons are Material Symbols ligatures** (`<span className="material-symbols-outlined">home</span>`),
which browser translation extensions will happily translate into broken text. The
mitigation shipped is `lang="tr" translate="no"` + `<meta name="google" content="notranslate">`
in `index.html`. Don't remove those. `docs/icon-translation-immunity-plan.md` describes the
unshipped codepoint-based fix (~840 usages across 86 files).

### Courier live tracking (phase 1)

Everything here is behind `FEATURE_FLAGS.COURIER_LIVE_TRACKING`; the backend checks the flag too, so the
UI only decides what to reveal. Phase 1 covers vehicles, client delivery points and the shipment's choice
of both — **no map, no live position, no approach notifications yet.**

Three services, split the way the backend is: `courierVehicleService.js` (a courier record's vehicles),
`companyLocationService.js` (a client's delivery points), `vehicleTrackingService.js` (the provider
connection and the plate-matching list). Where the UI lives:

- `components/couriers/CourierVehiclesTab.jsx` — a third tab in `EditCourierModal`, shown only for an
  in-house courier record. Delete removes a vehicle no shipment ever used and otherwise only deactivates it;
  the toast says which happened. Updates are partial, so reactivating sends `{active: true}` alone.
  While the flag is on, the courier record's own legacy plate/driver fields are hidden in both courier modals —
  the vehicle list is the single source of truth, and the old fields would drift from it.
- `components/couriers/ClientLocationsSection.jsx` — at the bottom of `ViewClientModal`.
- `components/courierShipments/ShipmentFormModal.jsx` — the vehicle picker (in-house couriers only) and the
  destination picker, both optional. Changing the courier or the client clears the matching choice, but a
  first render must not: the pickers keep the value the record came with until the user really changes it.
- `components/settings/CourierTrackingCard.jsx` — the token (write-only; the API answers `tokenSet`), the
  on/off state, a connection test and the two approach thresholds. The thresholds are stored in the company
  work settings, so saving them sends the current work settings back unchanged alongside.

When the provider runs in stub mode (`liveMode: false`, the default until a real Mobiliz token exists) the
vehicle list and positions are samples — the card and the vehicles tab both say so, and should keep saying so.

### G-Radar (cargo tracking)

The live sea/air tracking integration, formerly branded ShipsGo — the name was scrubbed
from all user-visible surfaces. Two services, deliberately split:

- `gRadarService.js` — master config (SUPER_ADMIN), and turning tracking on/off per cargo row.
- `gRadarCreditService.js` — wallet, pricing, credit purchases.

**Out of credits.** Credit-spending calls fail with `code: 'GRADAR_INSUFFICIENT_CREDITS'` (the approve response
carries it as `fetchFailureCode`). Hand that to `showGRadarCreditShortage({ user, navigate, context })` from
`src/utils/gRadarCreditGuidance.js` rather than showing the raw error: a BROKER_ADMIN (the only role that may buy
credits) gets a dialog whose "Buy credits" button opens `/payment/submit?tab=g-radar` (a new tab from the Add Cargo
modal, so the form survives); everyone else gets an "ask your admin" warning without a link.

Some backend enum constants still say `SHIPSGO_*` internally while serializing as
`GRADAR_*`; `constants.js` uses the external name. When a screen shows a constant the backend
sent, check what it renders for a value `constants.js` does not know — printing the raw value is
how the internal name reached the Balance Movements table.

**"Bilgileri Getir" (1 credit)** is not admin-only: a BROKER_USER whose G-Radar request an admin
approved may press it too. The server decides; cargo rows (list, detail, drawer details) carry
`gRadarFetchAllowed`, and `GRadarStatusCell` shows the button when
`!isReadOnly && (canManage || gRadarFetchAllowed)`, otherwise the "Bilgi bekleniyor" pill (with an
"admin must approve" tooltip for a BROKER_USER). `gRadarService.fetch` returns the envelope `code`;
403 `GRADAR_FETCH_NOT_APPROVED` / `GRADAR_FETCH_FORBIDDEN` toast the server message and reload the list.

The credit price lives on the **plan** (a broker-specific price is a custom plan). The backend refuses to keep G-Radar
on a plan without a price and answers with `GRADAR_PLAN_PRICE_MISSING` / `_IN_USE` / `_INVALID`;
`src/utils/gRadarPlanPrice.js` turns those codes into messages and validates price input. `BrokerSubscriptionsPage`
edits the plan price in place (`gRadarCreditService.updatePlanPrice`, with a `confirmDialog` naming how many companies the
plan affects), disables the G-Radar toggle while the plan has no price, and badges `gRadarPriceMissing` rows.

`src/utils/gRadarLabels.js` normalizes the provider's two inconsistent schemas (air returns
`movements`, sea returns per-container `movements`, with field names varying) into one shape
and translates codes to Turkish, falling back to a readable raw value for unknown codes.

The map is **MapLibre GL** (`CargoMap.jsx`), using MapTiler tiles when
`VITE_MAPTILER_API_KEY` is set and OpenFreeMap otherwise. The animated vehicle marker's
CSS (`.gradar-marker*` in `index.css`) is heavily interdependent — its comments explain
which measurements must change together, and why rotation and animation must sit on
separate elements.

### Landing page, SEO and analytics

`src/pages/landing/` (plus `src/pages/legal/`) is the public marketing surface.

- **Analytics is intentionally constrained**: `analytics.js` loads GA4 *only* on marketing
  and legal pages (never in the app) and *only* after explicit cookie consent — no
  load-then-ask. The measurement ID comes from `VITE_GA_MEASUREMENT_ID`, which is set in
  Vercel for Production only; local and Preview (staging) builds fall back to the
  placeholder `G-XXXXXXXXXX`, and `isConfigured()` keeps GA4 from loading there.
- **OG/Twitter tags stay static in `index.html`** because share crawlers don't run JS.
  `src/utils/seo.js` sets title/description/canonical and injects JSON-LD at runtime for
  routes that need their own; pricing and FAQ structured data is generated from
  `pricingPlans.js` / `Faq.jsx` so it can't drift from what's rendered.

## Environment

`.env.example` lists the variables. `VITE_API_BASE_URL` matters only for production
builds (dev derives it from the hostname); `VITE_MAPTILER_API_KEY` is optional.
