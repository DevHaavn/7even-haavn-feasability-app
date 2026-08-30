# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

7EVEN | HAAVN **ATRIUM** — a development-feasibility platform (React + Vite + TypeScript SPA) plus a family of self-contained static HTML surfaces under `public/`. It runs as a web app on Vercel, an installable PWA, and (historically) an Electron shell. There is no URL router: `App.tsx` switches full-screen views with React state (auth → home → workspace/hubs), and several surfaces are static HTML pages mounted in iframes.

## Commands

```bash
npx vite            # dev server on :5173 (preferred; `npm run dev` also boots Electron)
npm run build       # vite production build — run this to type-sanity-check before pushing
npm run test        # vitest run (suites live in src/engine/__tests__ and src/lib/__tests__)
npx vitest run src/engine/__tests__/cashflow.test.ts   # single test file
```

There is no lint step. `npx tsc --noEmit` currently fails on a pre-existing tsconfig deprecation (`baseUrl`), so use `npm run build` as the compile check.

## Deploy & verify (the loop that matters)

- Push to `main` → GitHub (`DevHaavn/7even-haavn-feasability-app`) → Vercel auto-deploys.
- **Live URL: `https://7even-haavn-feasability-app-redux.vercel.app`** — the old `feasibility-app.vercel.app` project is abandoned but still resolves with a stale build; never judge "not live" from it.
- Verify a deploy by polling the live URL for a marker you just introduced (a new class name, hex colour, etc.). For app-code changes, first grep the page for `/assets/index-*.js` and check the marker inside that bundle; for `public/*.html` changes, grep the file itself. Deploys usually land in 30–90s. **Beware:** the studio/black HTML files are 10–20MB — `head -c` on the response will miss markers that live after the embedded base64; download the whole file.
- Users see cached copies aggressively (installed PWA + iframes). Static pages loaded in iframes carry cache-bust query params (`/haavn-black.html?v=N` in `HaavnHomes.tsx`, `/haavn-display-suite.html?v=N`) — **bump the version whenever you edit those files** or the user will report your change "isn't live".

## Architecture

### The React app (`src/`)

- `App.tsx` — top-level state machine: `PasswordGate` (roles: admin / external / homes, 12h expiry in `src/pages/PasswordGate.tsx`; IntroScreen is retired) → `ProjectList` (the home page) → `ProjectWorkspace` (tabbed feasibility studio) or full-screen overlays (`CapitalPortal`, `HaavnManagementBase`, `HaavnHomes`).
- `src/engine/` — pure feasibility maths (cost stack, cashflow, finance waterfall, GST, BTR/BTS/hotel revenue, returns). This is the tested core; UI changes must not fork these numbers. Key entry points: `calculateCostStack`, `getProjectTDC` (real finance via waterfall), `getProfitMetrics`, `getProjectGDV`.
- `src/store/index.ts` (zustand) + `src/db/` — local persistence with Supabase cloud sync. Capital-side shared state syncs via `db/capitalCloud.ts` (localStorage keys pushed to a `capital_kv` table; realtime subscription broadcasts `capital-cloud-updated`). Supabase creds are hardcoded in `src/lib/supabase.ts` (project `vgvavmnqrdgcnledztyk`).
- `src/pages/tabs/` — the workspace tabs (CostStackTab, CashflowTab, etc.). The workspace chrome + all tab surfaces are skinned by `src/styles/atrium-studio.css`, scoped entirely under `.fxs` (dark chrome tokens `--chrome*` never themed; light surface = grey fabric bg + white tablets). Never let this leak into hubs/login.
- Auth gates hash-check or string-check codes client-side; `CapitalGate` uses a SHA-256 hash so the code doesn't ship in the bundle.

### The static surfaces (`public/`)

Self-contained HTML pages (own CSS/JS, Google Fonts only) that the React app mounts in iframes or links to:

- `haavn-black.html` — HAAVN BLACK home. Buttons `postMessage({haavnBlack: 'display'|'feasibility'|'capital'|'crm'|'return'|'logout'})` to the parent; `HaavnHomes.tsx` maps messages to app actions. Its burger menu, LED bars and chrome all live in this file.
- `hori7on-studio.html` — the HORI7ON investor showcase: a mini JS SPA (`PROJECTS` array + `render()/vHub()/vProject()`), with all imagery embedded as base64 in `MEDIA_*` objects merged over project entries by id. The hub stats strip is **computed live** from `PROJECTS` (`hubStats()`), so adding/editing a project updates portfolio GV, counts, states and classes automatically. Per-project optional fields drive the templates: `brandimg` (replaces titles with a logo), `devimg` (brand device above titles), `partners` (logo row), `cardidx`/`cardfit` (hub-card image choice/fit), `stats` (8-cell numbers panel — house rule: always show GFA/NSA and real scheme numbers from the architect's development summary).
- `hori7on.html` (intro → fade → studio), `hori7on-im-preview.html` (A4 print-to-PDF IM design), `project-7.html`, `haavn-display-suite.html`, plus many `*-preview.html` files — previews are the working method: **build a preview page, get sign-off, then port into the real surface.**

### Design language (applied everywhere)

- Brand gold `#d6b36a` (light `#f4e3bd`/`#e8d296`, deep `#a3782a`); LED green `#2fe07a` is HAAVN BLACK's accent and the universal "live/autosave" status colour (status greens stay green even where decorative accents went gold).
- JetBrains Mono for eyebrows/labels (letter-spaced uppercase), Cormorant Garamond serif for display, Inter for body.
- Recurring devices: one-line footer (▲ATRIUM | LIVE clock · MELBOURNE | chips), clear-glass boxless forms over video, rotating conic LED rings (`@property --X` + mask-composite ring), vertical draw/hold/release LED bar pairs, burger = two fat vertical bars morphing to a chevron `><` X.
- Wordmark assets are produced by tinting a source PNG through its alpha channel (see the many `*-white/-gold/-black.png` pairs in `public/`); Python + PIL is the tool of choice for asset prep, and AI/EPS brand files can be converted via Acrobat Distiller (`open -a "Acrobat Distiller" file.eps` → PDF → PyMuPDF render).

### Mobile rules

Phone fixes target `@media(max-width:600px)`: headers drop `env(safe-area-inset-top) + 57px` for the iPhone Dynamic Island, one-line footers wrap with compact chips, and `background-attachment: fixed` must not be used on mobile (iOS repaint wobble). `html,body` carry `overflow-x:hidden; overscroll-behavior-x:none`.
