import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const clinic1 = '00000000-0000-0000-0000-000000000001'
const clinic2 = '00000000-0000-0000-0000-000000000002'
const patient = '10000000-0000-0000-0000-000000000001'
const doctor = '20000000-0000-0000-0000-000000000001'
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE clinics (id uuid PRIMARY KEY, name text, slug text, subscription_plan text,
      trial_ends_at timestamptz, is_active boolean, created_at timestamptz, branding jsonb);
    CREATE TABLE doctors (id uuid PRIMARY KEY, clinic_id uuid, is_active boolean, full_name text, specialization text);
    CREATE TABLE patients (id uuid PRIMARY KEY, clinic_id uuid);
    CREATE TABLE appointments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid,
      patient_id uuid, doctor_id uuid, appointment_date date, created_at timestamptz,
      status text, consultation_fee numeric(10,2), reminder_sent boolean);
    CREATE TABLE otp_verifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid,
      contact_value text, contact_type text, created_at timestamptz DEFAULT now(),
      expires_at timestamptz, verified_at timestamptz);
    CREATE TABLE password_resets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text,
      created_at timestamptz DEFAULT now(), expires_at timestamptz);
    CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text, created_at timestamptz);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
    CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
    INSERT INTO clinics VALUES ('${clinic1}', 'Clinic A', 'a', 'free', now(), true, now(), '{"tagline":"Care"}'),
      ('${clinic2}', 'Clinic B', 'b', 'free', now(), true, now() - interval '40 days', '{}');
    INSERT INTO doctors VALUES ('${doctor}', '${clinic1}', true, 'Dr A', 'Physio'),
      ('20000000-0000-0000-0000-000000000002', '${clinic1}', true, 'Dr B', 'Physio');
    INSERT INTO patients VALUES ('${patient}', '${clinic1}'),
      ('10000000-0000-0000-0000-000000000002', '${clinic1}'),
      ('10000000-0000-0000-0000-000000000003', '${clinic1}');
    INSERT INTO appointments (clinic_id, patient_id, doctor_id, appointment_date, created_at, status, consultation_fee)
      SELECT '${clinic1}', '${patient}', '${doctor}', '2026-10-06', '2026-10-06 10:00Z', 'confirmed', 10
      FROM generate_series(1, 1200);
    INSERT INTO appointments (clinic_id, patient_id, doctor_id, appointment_date, created_at, status, consultation_fee)
      VALUES ('${clinic1}', '${patient}', '${doctor}', '2026-10-20', '2026-10-06 10:00Z', 'confirmed', 10);
    INSERT INTO appointments (clinic_id, appointment_date, created_at, status, consultation_fee)
      SELECT '${clinic2}', '2026-09-01', '2026-09-01 10:00Z', 'cancelled', 99 FROM generate_series(1, 4);
    INSERT INTO audit_logs (action, created_at) VALUES ('retained', now() - interval '2 years');
    INSERT INTO otp_verifications (expires_at)
      VALUES (now() - interval '2 days'), (now() - interval '3 days'),
        (now() - interval '1 hour'), (now() + interval '1 hour');
    INSERT INTO password_resets (expires_at)
      VALUES (now() - interval '2 days'), (now() - interval '1 hour'), (now() + interval '1 hour');
  `)
  const migration = await readFile(new URL('../migrations/016_database_efficiency.sql', import.meta.url), 'utf8')
  await db.exec(migration)
  await db.exec(migration)
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
  const metrics = (await one(`SELECT platform_metrics('2026-10-06 12:00Z', '2026-10-06') AS data`)).data
  assert.equal(metrics.totals.bookings_7d, 1201)
  assert.equal(metrics.totals.bookings_30d, 1201)
  assert.equal(metrics.totals.total_patients, 3)
  assert.equal(metrics.totals.active_clinics_7d, 1)
  assert.equal(metrics.clinics[0].bookings_total, 1201)
  assert.equal(metrics.clinics[0].doctors, 2)
  assert.equal(metrics.clinics[1].bookings_total, 4)
  assert.equal(metrics.clinics[1].last_booking_at.startsWith('2026-09-01'), true)
  const stats = (await one(`SELECT clinic_dashboard_stats($1, '2026-10-06', '2026-10-05') AS data`, [clinic1])).data
  assert.equal(stats.today.total, 1200)
  assert.equal(stats.today.confirmed, 1200)
  assert.equal(stats.this_week.total, 1200)
  assert.equal(stats.all_time.total_appointments, 1201)
  assert.equal(stats.all_time.total_patients, 1)
  assert.equal(stats.doctor_breakdown[0].total, 1200)
  const view = await one('SELECT * FROM v_clinic_dashboard WHERE clinic_id = $1', [clinic1])
  assert.equal(Number(view.total_revenue), 12010)
  assert.equal(Number(view.total_appointments), 1201)
  assert.equal(Number(view.active_doctors), 2)
  assert.equal(Number(view.total_patients), 3)
  assert.equal((await one("SELECT to_regclass('idx_audit_logs_action_created') AS name")).name, null)
  const removed = (await one('SELECT cleanup_expired_auth_records(1) AS data')).data
  assert.deepEqual(removed, { otp_verifications: 1, password_resets: 1 })
  await one('SELECT cleanup_expired_auth_records(1000)')
  assert.equal(Number((await one('SELECT count(*) AS n FROM otp_verifications')).n), 2)
  assert.equal(Number((await one('SELECT count(*) AS n FROM password_resets')).n), 2)
  assert.equal(Number((await one('SELECT count(*) AS n FROM audit_logs')).n), 1)
  assert.equal(Number((await one('SELECT count(*) AS n FROM appointments')).n), 1205)
  await assert.rejects(one('SELECT cleanup_expired_auth_records(0)'), /batch size/)
  await db.exec('SET ROLE anon')
  await assert.rejects(one(`SELECT platform_metrics(now(), '2026-10-06')`), /permission denied/)
  await db.exec('RESET ROLE; GRANT SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role; SET ROLE service_role')
  await one(`SELECT platform_metrics('2026-10-06 12:00Z', '2026-10-06')`)
  await one(`SELECT clinic_dashboard_stats($1, '2026-10-06', '2026-10-05')`, [clinic1])
  await one('SELECT cleanup_expired_auth_records(1)')
  await db.exec('RESET ROLE; TRUNCATE appointments, doctors, patients, clinics')
  const empty = (await one(`SELECT platform_metrics(now(), '2026-10-06') AS data`)).data
  assert.equal(empty.totals.clinics, 0)
  assert.deepEqual(empty.clinics, [])
  console.log('PASS: PostgreSQL migration rerun, >1,000-row metrics, clinic isolation, week bounds, revenue, cleanup, permissions, empty data')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally { await db.close() }
