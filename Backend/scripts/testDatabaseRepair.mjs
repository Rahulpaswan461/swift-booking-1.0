// Isolated PostgreSQL tests. Never reads .env or connects to Supabase.
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const clinic = '00000000-0000-0000-0000-000000000001'
const one = async sql => (await db.query(sql)).rows[0]
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE clinics (id uuid PRIMARY KEY);
    CREATE TABLE otp_verifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), expires_at timestamptz);
    CREATE TABLE password_resets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), expires_at timestamptz);
    INSERT INTO clinics VALUES ('${clinic}');
    INSERT INTO otp_verifications (expires_at) VALUES
      (now()-interval '3 days'), (now()-interval '2 days'), (now()-interval '1 hour'), (now()+interval '1 hour');
    INSERT INTO password_resets (expires_at) VALUES
      (now()-interval '3 days'), (now()-interval '2 days'), (now()-interval '1 hour'), (now()+interval '1 hour');
  `)
  const sql = await readFile(new URL('../migrations/017_repair_audit_and_auth_cleanup.sql', import.meta.url), 'utf8')
  await db.exec(sql)
  await db.exec(`SET ROLE service_role;
    INSERT INTO audit_logs (clinic_id, action, entity_type, details)
      VALUES ('${clinic}', 'clinic_registered', 'clinic', '{"statusCode":201}');
    RESET ROLE;`)
  await db.exec(sql)
  assert.equal(Number((await one('SELECT count(*) AS count FROM audit_logs')).count), 1)
  assert.equal(Number((await one('SELECT count(*) AS count FROM otp_verifications')).count), 4)
  assert.equal(Number((await one('SELECT count(*) AS count FROM password_resets')).count), 4)
  for (const invalid of ['0', '5001', 'NULL']) {
    await assert.rejects(one(`SELECT cleanup_expired_auth_records(${invalid})`), /batch size/)
  }
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`)
    await assert.rejects(one('SELECT * FROM audit_logs'), /permission denied/)
    await assert.rejects(one("INSERT INTO audit_logs (action,entity_type) VALUES ('forged','clinic') RETURNING id"), /permission denied/)
    await assert.rejects(one('SELECT cleanup_expired_auth_records(1)'), /permission denied/)
    await db.exec('RESET ROLE')
  }
  await db.exec('SET ROLE service_role')
  assert.deepEqual((await one('SELECT cleanup_expired_auth_records(1) AS result')).result, { otp_verifications: 1, password_resets: 1 })
  await one('SELECT cleanup_expired_auth_records(1000)')
  await db.exec('RESET ROLE')
  assert.equal(Number((await one('SELECT count(*) AS count FROM otp_verifications')).count), 2)
  assert.equal(Number((await one('SELECT count(*) AS count FROM password_resets')).count), 2)
  assert.equal(Number((await one('SELECT count(*) AS count FROM audit_logs')).count), 1)
  assert.equal(Number((await one('SELECT count(*) AS count FROM clinics')).count), 1)
  // Validate the corrected historical subscription definition independently.
  const historical = await readFile(new URL('../migrations/005_multi_tenant_saas_enhancements.sql', import.meta.url), 'utf8')
  await db.exec(historical.slice(historical.indexOf('CREATE TABLE IF NOT EXISTS subscriptions ('), historical.indexOf('-- 6. Audit Logs')).replace(/-- =+\s*$/, ''))
  await db.exec(`INSERT INTO subscriptions (clinic_id, plan) VALUES ('${clinic}', 'pro')`)
  await assert.rejects(db.exec(`INSERT INTO subscriptions (clinic_id, plan) VALUES ('${clinic}', 'pro')`), /duplicate key/)
  console.log('PASS: repair is rerunnable, retains records, stores clinic audit events, restricts API roles, bounds cleanup and preserves recent codes; historical subscription SQL is valid.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally { await db.close() }
