# Build: ATRIUM connector for Blaze (JB's Claude assistant)

**Goal:** let Blaze (Claude, in claude.ai) read and update ATRIUM tasks, boardroom items and meetings, so JB's morning brief reports them and JB can say "Blaze, add a task…" and it lands in ATRIUM.

**Approach:** add a remote MCP server to this repo as a Vercel function. JB then adds it in claude.ai → Settings → Connectors → Add custom connector. Connector traffic doesn't go through Claude's sandbox network allowlist, so no allowlist change is needed.

---

## 1. Endpoint

- New file `api/mcp.js` (Vercel serverless, Node). Implement MCP over **Streamable HTTP** (JSON-RPC 2.0 POST; `initialize`, `tools/list`, `tools/call`). The official `@modelcontextprotocol/sdk` is fine if it bundles cleanly on Vercel; otherwise hand-roll the three methods.
- **Auth:** require a long random secret. Simplest option that claude.ai custom connectors accept: put it in the path, `/api/mcp/<BLAZE_SECRET>`, via a Vercel rewrite. Reject anything without it (401). Secret lives in env `BLAZE_SECRET`. OAuth can come later.
- **Database access server-side only**, with env `SUPABASE_SERVICE_ROLE_KEY` (never the anon key, never shipped to the browser).

## 2. Tools (v1)

Data lives in `capital_kv` (one JSON blob per key). Match the existing shapes exactly. Read `public/atrium-workflow.html` (`snapshot()` / `adopt()`, key `atrium_workflow`) and `public/haavn-boardroom.html` / `public/atrium-meeting-hub.html` (key `haavn_boardroom_v1` / `haavn_boardroom`) before writing anything.

| Tool | Does |
|---|---|
| `list_tasks` | Workflow tasks, filter by owner / status / due before / department |
| `add_task` | Create a Workflow task (title, owner, due, dept, notes, priority) |
| `update_task` | Change status, owner, due or notes on one task by id |
| `list_boardroom_items` | Current weekly meeting items (agenda, assignee, status, due) |
| `add_boardroom_item` | Add an item to the upcoming Monday meeting |
| `list_meetings` | `atrium_meetings_v1`: upcoming meetings, plus actions and decisions from records |

Rules:
- **Read-modify-write safely.** Re-read the blob, apply the single change, write back only if `updated_at` hasn't moved since the read (retry once). Never overwrite a whole blob from a stale copy, because people edit these live.
- Stamp every write with `by: "Blaze"` and a timestamp, so the team can see what the assistant did.
- **No delete tool in v1.**
- Keep responses compact (id, title, owner, status, due), not whole blobs.

## 3. Test before deploy

- Unit-test the blob transforms against a copy of real data (vitest, `src/lib/__tests__` style).
- `npm run build` passes.
- Hit the endpoint locally with `initialize` → `tools/list` → `list_tasks`.

## 4. Deploy and hand over

- Set `BLAZE_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production), push to `main`, and verify on the live URL.
- Give JB the connector URL: `https://7even-haavn-feasability-app-redux.vercel.app/api/mcp/<secret>`.
- JB adds it at **claude.ai → Settings → Connectors → Add custom connector**, named **ATRIUM**.

## 5. Separate, important: lock down `capital_kv`

Right now the anon key is in the public pages and `capital_kv` RLS allows anyone to read, insert, update and delete. That table holds Capital, CRM, War Room, meetings and uploaded files. Plan a fix, but **don't break the live pages**: move reads and writes behind authenticated Supabase sessions or server functions, then tighten the policies. Scope this, show JB the plan, and don't ship it in the same change as the connector.
