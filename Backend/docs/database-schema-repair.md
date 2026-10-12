# Repair missing audit logging and authentication cleanup

These errors are database schema errors, not payment failures:

- `PGRST205` / `42P01` for `audit_logs`: the table is missing or not exposed in the API schema cache. Clinic creation can still succeed, but its audit event is not saved.
- `PGRST202` for `cleanup_expired_auth_records(p_batch_size)`: the scheduled cleanup RPC is missing or its cached signature is stale. The scheduler runs a minute after startup, then hourly; this is independent of clinic creation.

## Apply the focused repair

1. Open the Supabase project matching the backend's `SUPABASE_URL`.
2. In SQL Editor, run the complete contents of `Backend/migrations/017_repair_audit_and_auth_cleanup.sql`.
3. From Backend, run `npm run check:schema`. This reads schema metadata and queries zero rows; it does not run cleanup or fetch patient records.

Migration 017 creates the audit table if absent, ensures it is restricted to the backend service role, restores the bounded cleanup RPC, and requests a PostgREST schema reload. Applying it does not delete records. Subsequent scheduled cleanup removes only authentication codes that expired more than one day ago, up to 1,000 records per table per run.

The older migration 005 contained an invalid partial UNIQUE table constraint before the audit table definition; this syntax is now corrected. Do not rerun all of 005 as a repair on an existing database: it also changes unrelated patient/subscription fields. Use the focused 017 repair instead. Migration 017 is safe to rerun; it does not require the unrelated dashboard views in 016.

If the schema check succeeds but the running backend still reports missing objects, restart it to reload its environment and compare its configured Supabase project with the SQL Editor project. Hosting/shell environment variables take precedence over `.env`. The service-role Data API key cannot itself execute SQL migrations.

Validation: run `npm test`. The isolated PostgreSQL regression test is `PGLITE_MODULE=/path/to/pglite/dist/index.js node scripts/testDatabaseRepair.mjs`; it never loads `.env` or connects to Supabase.
