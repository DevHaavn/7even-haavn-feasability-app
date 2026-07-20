# Book 01 · 7EVEN Capital — live wiring plan

**Goal (Jamie, explicit):** keep the HTML book's silver-glass design AND the
7EVEN GROUP · Structure tab, but wire its dead buttons and static tables to the
real functions the original React `BudgetsAdmin` pillar had.

**Architecture — confirmed working.** The book (`public/atrium-book01-7even-
capital.html`) is served from the same origin as the app, so:
- it shares `localStorage` with the React app, and
- it can `fetch()` the same `/api/*` endpoints.

So wire the book's own `<script>` against shared storage + fetch. No React
rebuild, no touching the structure charts. `BudgetsAdmin.tsx` (1,270 lines)
stays in the repo as the logic reference to mirror.

## The four things to wire (in priority order)

### 1. Project spend / tracking — live feasibility costs (Preston / Caloundra / Waurn Ponds)
- Live data is in `localStorage` as `detailed-costs:<projectId>`:
  - `seed-preston-001`, `seed-caloundra-001`, `seed-geelong-001`
  - shape: `{ hardCosts[], headworks[], marketing[], statutory[], management[], consultants[] }`, each line `{ id, label, amount, phase, startDate, endDate, ... }`
- Project→id map (from `BudgetsAdmin.tsx` `PROJECT_LINKS.sev`):
  - Preston → `seed-preston-001`, Caloundra → `seed-caloundra-001`, Waurn Ponds → `seed-geelong-001`
- Sum each category's `amount` for the live per-project cost; replace the book's
  hardcoded Project spend column figures. Re-read on the `storage` event so
  edits in the feasibility studio show live.

### 2. Xero — Connect / Push / Pull button
- Real component calls `/api/*` (see `XeroChip`, `syncMsg` logic ~line 360–392 of `BudgetsAdmin.tsx`). Find the exact endpoints there (`/api/xero/...`).
- The book's Xero chip currently reads "XERO · PUSH / PULL · READY" but is inert.
  Wire the chip/buttons to `fetch()` those endpoints; mirror the connected /
  not-connected states the component shows.

### 3. 7even Capital expenses — own tab (already built in React, port the behaviour)
- The company running costs = `capital_admin_v3` → entity `sev` → `lines` where `s==='opex'`.
- Book should show these as their own tab (Jamie: NOT buried under Budget entry
  operating expenses). Read/write `capital_admin_v3` directly.

### 4. Budget entry + add-line
- Same store `capital_admin_v3`. Grid = entity `sev` `lines` by section
  (`revenue` / `cogs` / `opex`), 12 monthly cells `m[0..12]` + FY total.
- Add-line: push `{ id, name:'', s, m:new Array(12).fill(0) }` to `lines`, save,
  re-render. (The HTML's Budget tab shipped with NO add control and only 4 of
  14 opex lines — it is an abbreviated design preview, so this is a real build
  not a fix.)

## Guardrails
- Same-origin fetch/localStorage only; no new deps in the book.
- Never overwrite `detailed-costs:*` from the book — those are the feasibility
  studio's; the book READS them. Only `capital_admin_v3` is read+write here.
- Verify by driving the real iframe (mount + click), not by reading code — the
  regression today was claiming "verified" without exercising the actual path.
- Deploy in steps; each step independently verified live.

## Status
- Book restored as the surface (commit d52d3288). Design + structure back, live.
- Wiring: NOT started. This doc is the plan.
