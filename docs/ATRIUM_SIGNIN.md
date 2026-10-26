# ATRIUM sign-in and the database lockdown: where it stands (26 Oct 2026)

## Built and live (changes nothing anyone uses today)
- `/api/auth/login`, `/callback`, `/me`, `/logout`: Microsoft work-account sign-in (either company), PKCE, signed httpOnly session cookie (14 days). Code in `api/auth.js`, `api/_utils/atriumAuth.js`. Without the Microsoft app set up, login says so plainly and does nothing else.
- `/api/kv`: the server door to `capital_kv` with one rule table per role (`api/_utils/kvProxy.js`). **Not used by any page yet.**
- The roster (17 people, their roles) is in `atriumAuth.js` and matches the Blaze roster. Extra addresses a person links are kept in `atrium_identities` (SQL below).
- 15 tests in `src/lib/__tests__/auth.test.ts`.
- Backup of the whole table taken 26 Oct: `~/Desktop/ATRIUM/Backups/capital_kv-2026-10-26.json` (47 rows, 44.6 MB, not in the repo). Inventory of every key and every page that touches it: `docs/CAPITAL_KV_INVENTORY.md`.

## What only Jamie can do (nothing else is blocked on anyone)
1. **Register the Microsoft app** (Entra admin centre, in one tenant): App registrations, New registration. Name "ATRIUM sign-in". Supported account types: **Accounts in any organizational directory (multi-tenant)**. Redirect URI (Web): `https://7even-haavn-feasability-app-redux.vercel.app/api/auth/callback`. Then Certificates and secrets, New client secret. Delegated permissions needed: `openid`, `profile`, `email` (all are default, no admin consent needed beyond the sign-in itself).
   For the second company: its admin approves the app once (Enterprise applications, Permissions, Grant admin consent), or each person approves it on first sign-in if their tenant allows it.
2. **Add two settings in Vercel** (Production): `MS_AUTH_CLIENT_ID` (the Application ID) and `MS_AUTH_CLIENT_SECRET`. `SESSION_SECRET` already exists. Optional: `ATRIUM_ADMINS` (extra admin emails). Redeploy.
3. **Run `supabase/2026-10-26_signin_and_chat.sql`** in the Supabase SQL editor. It creates the sign-in link table and the chat tables, all closed to the public key.
   Never paste the secret or keys in chat, email or Teams.

## Next, in order
1. Sign-in screen in ATRIUM: a "Sign in with Microsoft" button beside the access code (access codes keep working for consultants and the sales login until their replacement is agreed).
2. Chat on real data: groups, members, messages and files through `/api/chat` and Supabase Storage (private bucket, signed links), live updates, alerts, email-if-unread through the existing Graph mail function.
3. Lockdown, per `CAPITAL_KV_LOCKDOWN_PLAN.md` phase 4: move pages to `/api/kv` one at a time, highest risk first (`capital_admin_v3`, accounts, CRM, pricing, uploaded files, engine). Files leave the table for the private bucket.
4. Cut over (phase 5): deny the public key on `capital_kv`, rotate it, after a forced refresh window.

## Decisions to confirm
- Access codes for consultants, builders and the HAAVN BLACK sales login: keep as a second way in (server-checked), or move each person to a Microsoft or email login. My recommendation: keep codes for now, check them on the server, retire later.
- Sensitivity of each key (first reading in the inventory) and the role rules in `kvProxy.js`.
