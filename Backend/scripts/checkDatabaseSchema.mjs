// Read-only schema check: no patient records are fetched and no cleanup is run.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
const { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key } = process.env
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
try {
  for (const [table, columns] of [
    ['audit_logs', 'id,clinic_id,user_id,user_role,action,entity_type,entity_id,details,ip_address,user_agent,created_at'],
    ['otp_verifications', 'id,expires_at'],
    ['password_resets', 'id,expires_at'],
  ]) {
    const { error } = await db.from(table).select(columns).limit(0).abortSignal(AbortSignal.timeout(15_000))
    if (error) {
      console.error(`${table}: unavailable (${error.code || 'connection error'}). ${error.message}`)
      process.exitCode = 1
    } else console.log(`${table}: expected columns available.`)
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Schema lookup failed (HTTP ${response.status}).`)
  const schema = await response.json()
  const rpc = schema.paths?.['/rpc/cleanup_expired_auth_records']?.post
  const body = rpc?.parameters?.find(parameter => parameter.in === 'body')?.schema
  const properties = body?.properties || schema.definitions?.[body?.$ref?.split('/').pop()]?.properties
  if (!properties?.p_batch_size) {
    console.error('cleanup_expired_auth_records(p_batch_size): unavailable in the API schema. Apply Backend/migrations/017_repair_audit_and_auth_cleanup.sql in Supabase SQL Editor.')
    process.exitCode = 1
  } else console.log('cleanup_expired_auth_records(p_batch_size): available (not executed).')
  if (process.exitCode) console.error('Use the same Supabase project as the backend. If the migration was already applied, reload its schema cache with NOTIFY pgrst, \'reload schema\';')
  else console.log('Audit/cleanup schema check passed. No records read, inserted or deleted.')
} catch (error) {
  console.error(`Schema check failed: ${error.message}`)
  process.exitCode = 1
}
