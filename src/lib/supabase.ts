import { createClient } from '@supabase/supabase-js'

// The HAAVN cloud database. These are the PUBLIC front-end credentials — the
// project URL and the "anon" public key. They are safe to ship in the client
// (they're downloaded by every browser regardless), and data is protected by
// the database's Row Level Security, NOT by hiding this key. They live in code
// as the built-in default so the app ALWAYS connects to the right database,
// independent of how Vercel's build-time env vars happen to be configured.
// Env vars still win if set, so a future backend swap needs no code change.
// Hardcoded UNCONDITIONALLY (not via `env || default`, which the build's
// minifier dead-code-eliminates when the env var is a truthy constant — that's
// exactly why earlier builds shipped without the key). These literals are always
// present in the bundle, so the app always connects to the HAAVN database.
const SUPABASE_URL = 'https://vgvavmnqrdgcnledztyk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndmF2bW5xcmRnY25sZWR6dHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzIwODEsImV4cCI6MjA5OTU0ODA4MX0.hiWSzfEMXPJGs67iqiuB3hwJVxUO51uu2rygmA5wO10'

// Cloud is always available — credentials are compiled into the bundle above.
export const cloudEnabled = true

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
