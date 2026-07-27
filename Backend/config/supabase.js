import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const key = process.env.SUPABASE_SERVICE_KEY || ''

// The backend must use a SECRET / service_role key so it bypasses Row-Level
// Security. A publishable/anon key (prefix `sb_publishable_` or a JWT with
// role "anon") is subject to RLS and will fail writes to protected tables
// like `subscriptions` ("new row violates row-level security policy").
if (key.startsWith('sb_publishable_') || key.startsWith('sb_publi')) {
  console.error(
    '\n[Supabase] ⚠️  SUPABASE_SERVICE_KEY looks like a PUBLISHABLE (anon) key.\n' +
    '            The backend needs the SECRET key (Supabase → Settings → API keys → secret,\n' +
    '            prefix `sb_secret_`). RLS-protected writes (e.g. subscriptions) will fail until this is fixed.\n'
  )
}

const supabase = createClient(process.env.SUPABASE_URL, key)

export default supabase
