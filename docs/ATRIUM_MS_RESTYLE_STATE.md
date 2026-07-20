# ATRIUM Management System restyle — where it got to

**File being restyled:** `public/atrium-management.html` — 1807 lines, self-contained,
iframed by Capital Base pillar 03 and HM pillar 01.
**Target:** `atrium-management-system-preview_1.html` + `ATRIUM_ManagementSystem_Build_Playbook.md`.
**Golden rule:** change how it LOOKS, never the numbers or the wiring.

## Done

- **Step 0 — theme + shell.** Token VALUES remapped in place, names kept, so ~1800
  lines of rules inherit the new look untouched: forest-black → blue-black, new
  silver, `--f-*` demoted to functional-only, light palette green-grey → blue-grey.
  Chrome (topbar + rail) is the ATRIUM gradient and stays dark in both themes
  because it sits outside `.main`, which is what carries the theme class.
- **Step 1 — shared surfaces.** KPI value green → ink. Feature card green slab →
  silver-glass wash. Selection, focus ring and section livery → silver.
- **Icon rail.** 214px labelled → 64px icon rail, CSS only. `renderRail()` and
  `railItem()` untouched; labels visually-hidden so they stay in the a11y tree.
  The background plate's `inset` had to follow from 214px to 64px.
- **Background.** The architectural plate (`/renders/atrium-surface-1.jpg`) with
  the concept's scrim, both themes. Extracted out of the concept's base64.
- **Portfolio.** Project cards one per row.

## Not done — Steps 2–7

Senior Mgmt · Projects · Feasibility · Accounts · **Meetings**.
JB has supplied approved screens for Portfolio, Feasibility, Accounts and Meetings.
**Meetings has been raised repeatedly and is the priority.**

## Traps already hit — don't re-learn these

1. **`.wcard` is `background:#fff` in BOTH themes.** White sheets on a dark ground.
   Colour its text against WHITE, not against the page. Setting the KPI value to
   near-white made it invisible in dark, and it shipped before being caught.
   *Check the surface, not the page.*
2. **Specificity.** `.fxs .x` and `.ccx .x` tie, so stylesheet order decides and
   the studio wins. Use `.fxs.ccx .x` to override a studio rule. This bit 3 times.
3. **The concept is drawn dark-only; the brand palette is drawn light-only.**
   Every brand colour needs checking in both. So far: silver `#cdd8e2` vanishes in
   light, `#237A52` sinks in dark, `#1FE87A` glares in dark.
4. **`vite preview` serves `dist/`.** Rebuild after editing `public/`, and
   cache-bust the URL, or you will review a stale bundle and think it worked.
5. **Live URL is `7even-haavn-feasability-app-redux.vercel.app`.**
   `feasibility-app-jamie-1961s-projects…` is an abandoned Vercel project that
   hasn't built in weeks and will never show new work.

## Also outstanding, unrelated to this restyle

- **`capital_kv` is not created.** `src/db/capitalCloud.ts` fails silently, so all
  Capital Base data — including everything Lewis enters in Capital Command — lives
  in one browser's localStorage and is invisible to everyone else. SQL is ready in
  `supabase-setup.sql`.
- **Daniel's 6-item CFO bug list** is recon'd but unbuilt, pending 4 decisions.
  See the memory note `daniel-cfo-bugfix-batch`.
