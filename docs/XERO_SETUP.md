# Connecting Xero to the Capital Base admin tool

The app ships with the full OAuth 2.0 server side in `api/xero/`. Secrets and
tokens never touch the browser: the client secret lives in Vercel environment
variables, and after connecting, Xero tokens are held in an AES-256-GCM
encrypted `httpOnly` cookie that page JavaScript cannot read.

## One-time setup (Jamie)

1. **Create the Xero app**
   - Go to https://developer.xero.com/app/manage and sign in with the Xero login.
   - "New app" → name it `7EVEN Capital Base`, choose **Web app**.
   - Company or application URL: `https://feasibility-app-nu.vercel.app`
   - Redirect URI (exact): `https://feasibility-app-nu.vercel.app/api/xero/callback`
   - Save, then copy the **Client ID** and generate a **Client Secret**.

2. **Add the environment variables in Vercel**
   - Vercel dashboard → feasibility-app project → Settings → Environment Variables:
     - `XERO_CLIENT_ID` — from step 1
     - `XERO_CLIENT_SECRET` — from step 1 (keep it only here, never in the repo)
     - `SESSION_SECRET` — any long random string, 32+ characters
       (generate one: `openssl rand -hex 32`)
     - `APP_URL` — `https://feasibility-app-nu.vercel.app`
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

Scopes requested: transactions, contacts (read), settings (read), budgets
(read), reports (read), plus `offline_access` for token refresh. Nothing is
written to Xero until we explicitly build push flows.

## Next build steps once connected

1. Map each Xero organisation to a company tab (7EVEN / HAAVN / HAAVN MANAGEMENT).
2. Pull invoices & bills into the register (replacing manual entry).
3. Pull Budget Manager budgets and reconcile against the FY27 grid.
4. Push project-tagged costs to Xero tracking categories so project spend
   reads the same in both systems.
