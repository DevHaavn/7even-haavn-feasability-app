# Plan: lock down `capital_kv` (scoping only, nothing built)

Separate from the Blaze connector. This is the plan, to be agreed before any change. It must not ship in the same change as the connector.

## What is exposed today (checked 2026-10-08)

- The Supabase **anon key** is in the public app bundle and in about 20 static pages under `public/`. Anyone who opens the site can read it.
- With that key, `capital_kv` can be **read** by anyone (confirmed: 31 rows listed with the anon key alone). The RLS policy also allows insert, update and delete for anyone, per the connector brief.
- The table holds, among others: `nav_workspace` (Workflow, tasks, buyers, profiles), `haavn_boardroom`, `atrium_meetings_v1`, `atrium_crm_v2`, `haavn_homes_crm`, `capital_admin`, `atrium-accounts-v1`, `haavn_black_series` (pricing), `atrium_zeroed:*` (engine projects), `atrium_notifications`, and uploaded files (`atrium_file_*`).
- So a stranger with the public key can read Capital, CRM and accounts data, and overwrite or delete any row.

## Why it is not a one-line fix

Every surface talks to the table **directly from the browser** with the anon key: the React app (`src/db/capitalCloud.ts`, `src/lib/supabase.ts`) and the static pages (`atrium-workflow.html`, `haavn-boardroom.html`, `atrium-meeting-hub.html`, `atrium-management.html`, `atrium-accounts.html`, the Studio, the engine, and more). Tightening the policy first would break all of them at once, including live multi-user editing.

There is no Supabase Auth session today. The app's gate is a client-side access code with role stored in localStorage, which Supabase cannot verify.

## Options

1. **Server functions in front of the table (recommended).** One Vercel function (`/api/kv`) is the only thing that holds the service key. Pages call it instead of Supabase. It checks a signed session (issued at login by another function, replacing the localStorage role) and enforces per-key rules: who may read or write which key. Then RLS is switched to deny anon entirely.
2. **Supabase Auth + per-key RLS.** Real logins (magic link or SSO) and policies by role. Strongest, biggest change: every user needs an account, every page needs a session.
3. **Stopgap: split the table.** Move the most sensitive keys (`capital_admin`, `atrium_crm_v2`, accounts, pricing) behind option 1 first, leave low-risk keys open until phase 2.

## Recommended phases (option 1, no big bang)

1. **Inventory.** List every read/write of `capital_kv` and each key's sensitivity (script over `src/` and `public/`). Output: a table of key, who uses it, who should be allowed.
2. **Server session.** `/api/login` verifies the access code server-side (codes become server env hashes) and sets a signed httpOnly cookie carrying the role. No more role in localStorage.
3. **`/api/kv` proxy.** Same shape as the REST calls the pages make today (get by key, upsert, realtime replaced by short polling or Supabase Realtime via a scoped token). Per-key allow list by role. Writes keep the `updated_at` compare-and-set used by the Blaze connector.
4. **Migrate pages one at a time** behind a flag, starting with the highest risk keys. The old direct path keeps working until a page is migrated.
5. **Cut over.** When every page is migrated, revoke anon access in RLS (deny all for anon, allow service role only), rotate the anon key, remove it from the bundle.
6. **Backups first.** Before step 5, export the whole table, and keep a nightly export.

## Risks to manage

- Live multi-user editing and the auto-save safety rules (never re-seed or migrate in a realtime callback).
- The installed PWA and cached iframes: old pages will keep using the anon key until they refresh, so cut over only after a forced refresh window.
- The HAAVN BLACK sales tool, Studio TV pairing (room codes via `capital_kv`) and the engine all write from browsers and need the proxy too.
- The Blaze connector is unaffected: it uses the service key on the server.

## Decisions needed from Jamie

- Is option 1 (server proxy) the direction, or do you want real logins (option 2)?
- Which keys are the most urgent to protect first?
- Who must stay able to use the app without a personal account (consultants, builder logins)?

## Immediate low-risk step (not done)

Take a full export of `capital_kv` now. It changes nothing and is needed before any of the above.
