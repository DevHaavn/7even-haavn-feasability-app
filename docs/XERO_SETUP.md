# Connecting Xero to the Capital Base admin tool

The app ships with the full OAuth 2.0 server side in `api/xero/`. Secrets and
tokens never touch the browser: the client secret lives in Vercel environment
variables, and after connecting, Xero tokens are held in an AES-256-GCM
encrypted `httpOnly` cookie that page JavaScript cannot read.

## One-time setup (Jamie)

**First: find your live URL.** Open Capital Base in the browser and copy the
domain from the address bar — that's your `<LIVE_URL>` (the current deployment
is the Vercel project `7even-haavn-feasability-app-redux`, i.e.
`https://7even-haavn-feasability-app-redux.vercel.app`, unless you've attached a
custom domain, in which case use that). Every URL below must use that exact
domain or the OAuth redirect will fail.

1. **Create the Xero app**
   - Go to https://developer.xero.com/app/manage and sign in with the Xero login.
   - "New app" → name it `7EVEN Capital Base`, choose **Web app**.
   - Company or application URL: `<LIVE_URL>`
   - Redirect URI (exact, must match character-for-character):
     `<LIVE_URL>/api/xero/callback`
   - Save, then copy the **Client ID** and generate a **Client Secret**.
   - (HAAVN's separate Xero login is a *second* app/connection — repeat this
     later for the `haavn` group; the app connects each group independently.)

2. **Add the environment variables in Vercel**
   - Vercel dashboard → **7even-haavn-feasability-app-redux** → Settings →
     Environment Variables (Production):
     - `XERO_CLIENT_ID` — from step 1
     - `XERO_CLIENT_SECRET` — from step 1 (keep it only here, never in the repo)
     - `SESSION_SECRET` — any long random string, 32+ characters
       (generate one: `openssl rand -hex 32`)
     - `APP_URL` — `<LIVE_URL>` (pins the redirect URI so it always matches the
       one you registered above)
   - Redeploy so the functions pick the variables up.

3. **Connect**
   - Open Capital Base → 01 Budgets/Administration.
   - The Xero chip (top right) will now read **Connect to Xero** — click it,
     sign in, and authorise each organisation:
     - 7even Capital Pty Ltd
     - 7even Enterprise (Preston) Pty Ltd
     - 7even Enterprise (Caloundra) Pty Ltd
   - Back in the app the chip shows **Connected · N orgs** with a green light.

## What each endpoint does

| Endpoint | Purpose |
| --- | --- |
| `GET /api/xero/connect` | Redirects to Xero's consent screen (CSRF-protected with a state cookie) |
| `GET /api/xero/callback` | Exchanges the code for tokens, records the authorised orgs, sets the encrypted session cookie |
| `GET /api/xero/status` | Tells the app whether Xero is configured/connected; silently refreshes expired tokens |
| `GET /api/xero/disconnect` | Clears the session cookie |

Scopes requested (granular, read-only — required for apps created after
Mar 2026): `accounting.invoices.read`, `accounting.payments.read`,
`accounting.banktransactions.read`, `accounting.contacts.read`,
`accounting.settings.read`, plus `openid profile email offline_access` for
sign-in and token refresh. Read-only: **nothing is ever written to Xero** until
we explicitly build push flows. (`accounting.invoices.read` covers bills too —
they're ACCPAY invoices in the Xero API.)

## Next build steps once connected

1. Map each Xero organisation to a company tab (7EVEN / HAAVN / HAAVN MANAGEMENT).
2. Pull invoices & bills into the register (replacing manual entry).
3. Pull Budget Manager budgets and reconcile against the FY27 grid.
4. Push project-tagged costs to Xero tracking categories so project spend
   reads the same in both systems.
