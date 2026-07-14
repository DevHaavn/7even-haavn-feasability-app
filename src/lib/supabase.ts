import { createClient } from '@supabase/supabase-js'

// The HAAVN cloud database. These are the PUBLIC front-end credentials — the
// project URL and the "anon" public key. They are safe to ship in the client
// (they're downloaded by every browser regardless), and data is protected by
// the database's Row Level Security, NOT by hiding this key. They live in code
// as the built-in default so the app ALWAYS connects to the right database,
// independent of how Vercel's build-time env vars happen to be configured.
// Env vars still win if set, so a future backend swap needs no code change.
const DEFAULT_SUPABASE_URL = 'https://vgvavmnqrdgcnledztyk.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndmF2bW5xcmRnY25sZWR6dHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzIwODEsImV4cCI6MjA5OTU0ODA4MX0.hiWSzfEMXPJGs67iqiuB3hwJVxUO51uu2rygmA5wO10'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY

// Cloud is always available now — credentials are guaranteed by the defaults above.
export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

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
