/**
 * Capital Base cloud sync — shared backend for the back-of-house pillars.
 *
 * Every Capital/CRM module stores its whole state as one JSON blob under a
 * localStorage key. Rather than a bespoke table per module, we mirror those
 * blobs into a single key-value table (`capital_kv`) so the whole team shares
 * one live dataset. Mirrors the projects sync in db/cloud.ts: fire-and-forget
 * upserts on save, pull-on-open (cloud wins), realtime fan-out to every
 * connected browser.
 *
 * Degrades gracefully: if the cloud is unconfigured or the table doesn't exist
 * yet, every call fails silently and the app runs exactly as before off
 * localStorage. See docs/CAPITAL_BACKEND.md for the one-time table setup.
 */

import { supabase, cloudEnabled } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// The blob keys owned by the Capital Base. Only these are hydrated on pull.
export const CAPITAL_KEYS = [
  'capital_admin_v3',    // Budgets / Administration (CFO model — live shared)
  'capital_admin_v2',    // Budgets / Administration (legacy)
  'capital_deploy_v2',   // Capital Command Centre (legacy — pre-ATRIUM rebuild)
  'capital_command_v1',  // Capital Command (pillar 02, ATRIUM rebuild)
  'war_room_v1',         // War Room — targets, contacts, signal feed
  'war_pipeline_v1',     // Division pipelines + workflow jobs
  'sales_stock_v1',      // 7ED stock ledger
  'hm_tenders_v1',       // HM tender register
  'haavn_logistics_v1',  // HAAVN Homes logistics
]

/** Fire-and-forget upsert of one blob. Called from every module save. */
export function pushKV(key: string, value: unknown) {
  if (!cloudEnabled) return
  supabase.from('capital_kv')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(({ error }) => { if (error) console.warn('[capital-cloud] push', key, error.message) })
}

/** Pull all Capital blobs into localStorage. Cloud wins over stale local. */
export async function pullCapitalCloud(): Promise<boolean> {
  if (!cloudEnabled) return true
  try {
    const { data, error } = await supabase.from('capital_kv').select('key, value')
    if (error) { console.warn('[capital-cloud] pull', error.message); return false }
    for (const row of data ?? []) {
      if (CAPITAL_KEYS.includes(row.key as string)) {
        try { localStorage.setItem(row.key as string, JSON.stringify(row.value)) } catch { /* ignore */ }
      }
    }
    return true
  } catch (err) {
    console.warn('[capital-cloud] pull failed', err)
    return false
  }
}

// ── Real-time subscription ────────────────────────────────────────────────────

let channel: RealtimeChannel | null = null

export function subscribeCapitalRealtime(onUpdate: () => void) {
  if (!cloudEnabled) return () => {}
  if (channel) channel.unsubscribe()

  channel = supabase
    .channel('capital-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'capital_kv' }, async () => {
      await pullCapitalCloud()
      onUpdate()
    })
    .subscribe()

  return () => { channel?.unsubscribe(); channel = null }
}
