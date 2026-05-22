import { createClient } from '@supabase/supabase-js'

console.log("url",process.env.SUPABASE_URL)
console.log('key: ',process.env.SUPABASE_SERVICE_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default supabase
