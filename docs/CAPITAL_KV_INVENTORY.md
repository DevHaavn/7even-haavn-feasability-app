# capital_kv inventory (26 Oct 2026)

Generated from the live table (47 rows, 44.6 MB) and a scan of `src/`, `public/` and `api/`. Phase 1 of `CAPITAL_KV_LOCKDOWN_PLAN.md`. Sensitivity is my first reading, to be confirmed.

Backup taken the same day: `~/Desktop/ATRIUM/Backups/capital_kv-2026-10-26.json` (not in the repo).

## Keys in the table

| Key | Size | Last written | Sensitivity | Files that name it |
|---|---|---|---|---|
| `atrium-accounts-v1` | 9 KB | 2026-10-02 | high | `atrium-accounts-black-preview.html`, `atrium-accounts.html` |
| `atrium_crm_v2_preview` | 1 KB | 2026-09-29 | high | none found by name |
| `atrium_file_*` (20 rows) | 41.0 MB | 2026-10-25 | high | `atrium-black.html`, `atrium-meeting-hub-v3-preview.html`, `atrium-meeting-hub.html`, `atrium-navigators-preview.html`, `atrium-workflow-mgmt-preview.html`, `atrium-workflow-preview.html` +1 more |
| `atrium_meetings_v1` | 36 KB | 2026-08-11 | medium | none found by name |
| `atrium_meetings_v2_preview` | 2 KB | 2026-09-29 | low | none found by name |
| `atrium_mgmt_v2` | 11 KB | 2026-10-15 | medium | `atrium-management.html` |
| `atrium_notifications` | 22 KB | 2026-10-25 | medium | `atrium-black.html`, `atrium-navigators-preview.html`, `atrium-workflow.html` |
| `atrium_notifications_preview` | 2 KB | 2026-09-30 | low | `atrium-black.html`, `atrium-navigators-preview.html`, `atrium-workflow-mgmt-preview.html`, `atrium-workflow.html` |
| `atrium_tasks_v2_preview` | 1 KB | 2026-09-29 | low | none found by name |
| `atrium_workflow` | 67 KB | 2026-09-29 | medium | `atrium-workflow-preview.html` |
| `atrium_zeroed:*` (3 rows) | 123 KB | 2026-09-15 | high | `atrium-engine-zoom-preview.html`, `pages/AtriumZeroed.tsx` |
| `blaze_audit` | 49 KB | 2026-10-25 | medium | `api/_utils/blaze.js`, `atrium-workflow.html` |
| `capital_admin_v3` | 26 KB | 2026-08-26 | high | `db/capitalCloud.ts` |
| `haavn_black_atrium_feas` | 110 KB | 2026-08-20 | medium | `haavn-black-feasibility.html`, `haavn-feas-preview.html` |
| `haavn_black_series` | 360 KB | 2026-08-18 | high | `haavn-black-series.html` |
| `haavn_boardroom` | 539 KB | 2026-10-25 | medium | `api/_utils/blaze.js`, `atrium-black.html`, `atrium-meeting-hub-preview.html`, `atrium-meeting-hub-v3-preview.html`, `atrium-meeting-hub.html`, `atrium-workflow-preview.html` +2 more |
| `haavn_boardroom_preview` | 3 KB | 2026-10-04 | low | `atrium-black.html`, `atrium-meeting-hub-preview.html`, `atrium-meeting-hub.html`, `atrium-workflow-mgmt-preview.html`, `atrium-workflow-preview.html`, `atrium-workflow.html` +1 more |
| `haavn_boardroom_v3_preview` | 5 KB | 2026-09-29 | low | `atrium-meeting-hub-v3-preview.html`, `atrium-navigators-preview.html` |
| `haavn_dm_programme` | 23 KB | 2026-10-04 | medium | `atrium-dm-programme.html`, `atrium-workflow-mgmt-preview.html`, `atrium-workflow.html`, `haavn-management-programme.html` |
| `haavn_dm_programme_preview` | 24 KB | 2026-10-04 | low | `atrium-dm-programme.html` |
| `haavn_homes_crm` | 1 KB | 2026-08-06 | high | `haavn-homes-crm.html` |
| `haavn_path_to_market` | 10 KB | 2026-08-05 | medium | none found by name |
| `hb_display_room_WCCF` | 1 KB | 2026-10-14 | low | none found by name |
| `nav_workspace` | 90 KB | 2026-10-25 | medium | `api/_utils/blaze.js`, `atrium-black.html`, `atrium-workflow-mgmt-preview.html`, `atrium-workflow.html` |
| `nav_workspace_mgmt_preview` | 54 KB | 2026-10-04 | low | `atrium-workflow-mgmt-preview.html` |
| `nav_workspace_preview` | 20 KB | 2026-09-30 | low | `atrium-navigators-preview.html` |

## Surfaces that talk to the table directly (all use the public anon key)

- `api/_utils/blaze.js`
- `public/atrium-accounts-black-preview.html`
- `public/atrium-accounts.html`
- `public/atrium-black.html`
- `public/atrium-dm-programme.html`
- `public/atrium-engine-zoom-preview.html`
- `public/atrium-management.html`
- `public/atrium-meeting-hub-preview.html`
- `public/atrium-meeting-hub-v3-preview.html`
- `public/atrium-meeting-hub.html`
- `public/atrium-navigators-preview.html`
- `public/atrium-workflow-mgmt-preview.html`
- `public/atrium-workflow-preview.html`
- `public/atrium-workflow.html`
- `public/haavn-black-display/index.html`
- `public/haavn-black-feasibility.html`
- `public/haavn-black-series.html`
- `public/haavn-black-studio.html`
- `public/haavn-boardroom.html`
- `public/haavn-feas-preview.html`
- `public/haavn-homes-crm.html`
- `public/haavn-management-programme.html`
- `src/db/capitalCloud.ts`
- `src/pages/AtriumZeroed.tsx`
- `src/pages/capital/CapitalCommand.tsx`
- `src/pages/capital/capitalModel.ts`

## Reading

- 26 files read or write `capital_kv` straight from the browser. Each is one migration to the server proxy in phase 4.
- 99 percent of the bytes are `atrium_file_*` (uploaded documents, up to 4.8 MB each as base64 in a JSON value). They need a real file store (Supabase Storage, private bucket, signed links) rather than the proxy.
- Highest first: `capital_admin_v3`, `atrium-accounts-v1`, CRM keys, `haavn_black_series` pricing, uploaded files, `atrium_zeroed:*` engine projects.
- Preview twins (`*_preview`) can be dropped or protected last.
