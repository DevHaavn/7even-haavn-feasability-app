import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// True only when both cloud credentials are present at build time.
// When false the app runs local-only instead of crashing.
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

if (!cloudEnabled && typeof console !== 'undefined') {
  console.warn('[supabase] cloud sync disabled — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing at build time')
}

// createClient throws on empty URL/key, which would black-screen the whole app.
// Fall back to harmless placeholders so the app still loads; network calls just
// fail silently (they're all caught in db/cloud.ts) and we run off localStorage.
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    realtime: { params: { eventsPerSecond: 10 } },
  },
)
