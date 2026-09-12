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
pilot broker. The frontend only reveals UI — flagged endpoints check the flag themselves.
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
them in `try/catch` themselves.)

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
  return `null` for unknown values on purpose — render the raw value rather than
  mislabelling it.

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
- `constants.js` items keep a `labelKey`; their `label` / `displayName` / `description` are
  getters over `t()`, so callers read `option.label` as before. Don't add literal labels there.
- Menus come from `menuConfig.js` (`HOME_ITEM`, `getGeneralMenuItems(user)`, `SUPPORT_ITEMS`,
  `MANAGEMENT_ITEMS`) for both `Sidebar` and `MobileMenu`.
- Format dates and numbers with `getCurrentLocale()`, not a hard-coded `'tr-TR'` (many old
  call sites still have it).
- The language picker (`LanguageSelectCard` on the profile page) is **SUPER_ADMIN-only**
  until translation is complete, so customers never see a half-English app. Text produced by
  the backend (error messages, notification titles) is still Turkish.

**Icons are Material Symbols ligatures** (`<span className="material-symbols-outlined">home</span>`),
which browser translation extensions will happily translate into broken text. The
mitigation shipped is `lang="tr" translate="no"` + `<meta name="google" content="notranslate">`
in `index.html`. Don't remove those. `docs/icon-translation-immunity-plan.md` describes the
unshipped codepoint-based fix (~840 usages across 86 files).

### G-Radar (cargo tracking)

The live sea/air tracking integration, formerly branded ShipsGo — the name was scrubbed
from all user-visible surfaces. Two services, deliberately split:

- `gRadarService.js` — master config (SUPER_ADMIN), and turning tracking on/off per cargo row.
- `gRadarCreditService.js` — wallet, pricing, credit purchases.

Some backend enum constants still say `SHIPSGO_*` internally while serializing as
`GRADAR_*`; `constants.js` uses the external name.

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
  load-then-ask. `GA_MEASUREMENT_ID` is still the placeholder `G-XXXXXXXXXX`, and
  `isConfigured()` blocks requests until it's replaced.
- **OG/Twitter tags stay static in `index.html`** because share crawlers don't run JS.
  `src/utils/seo.js` sets title/description/canonical and injects JSON-LD at runtime for
  routes that need their own; pricing and FAQ structured data is generated from
  `pricingPlans.js` / `Faq.jsx` so it can't drift from what's rendered.

## Environment

`.env.example` lists the variables. `VITE_API_BASE_URL` matters only for production
builds (dev derives it from the hostname); `VITE_MAPTILER_API_KEY` is optional.
