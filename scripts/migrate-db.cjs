// Copy ALL data from the OLD Supabase project into the NEW one.
// OLD creds come from .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// NEW creds come from env vars NEW_SUPABASE_URL / NEW_SUPABASE_KEY.
// Run AFTER the new project's schema is created (supabase-setup.sql).
//
//   NEW_SUPABASE_URL=https://xxxx.supabase.co NEW_SUPABASE_KEY=eyJ... \
//     node scripts/migrate-db.cjs
//
const fs = require('fs')
const ROOT = '/Users/jamiebaldwin/Library/CloudStorage/OneDrive-SharedLibraries-7evenCapital/feasibility-app'
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: [ROOT + '/node_modules'] }))

const env = fs.readFileSync(ROOT + '/.env.local', 'utf8')
const OLD_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const OLD_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const NEW_URL = process.env.NEW_SUPABASE_URL
const NEW_KEY = process.env.NEW_SUPABASE_KEY
if (!NEW_URL || !NEW_KEY) { console.error('Set NEW_SUPABASE_URL and NEW_SUPABASE_KEY env vars.'); process.exit(1) }

const oldDb = createClient(OLD_URL, OLD_KEY)
const newDb = createClient(NEW_URL, NEW_KEY)

// Order matters: parents before children (foreign keys).
const TABLES = ['projects', 'project_data', 'mix_scenarios', 'scenario_data', 'snapshots', 'feasibility_files']
const CONFLICT = { project_data: 'project_id', scenario_data: 'scenario_id' } // upsert keys

;(async () => {
  for (const t of TABLES) {
    const { data, error } = await oldDb.from(t).select('*')
    if (error) { console.error(`  ✗ read ${t}:`, error.message); continue }
    if (!data || data.length === 0) { console.log(`  – ${t}: nothing to copy`); continue }
    const opts = CONFLICT[t] ? { onConflict: CONFLICT[t] } : undefined
    const { error: werr } = await newDb.from(t).upsert(data, opts)
    if (werr) console.error(`  ✗ write ${t} (${data.length} rows):`, werr.message)
    else console.log(`  ✓ ${t}: copied ${data.length} rows`)
  }
  console.log('Migration complete.')
  process.exit(0)
})()
