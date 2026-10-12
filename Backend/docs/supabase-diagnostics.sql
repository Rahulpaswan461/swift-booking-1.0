-- Read-only: run in Supabase SQL Editor before/after deployment.
-- Largest public tables: heap/TOAST plus indexes (includes dead tuples).
SELECT relname AS table_name, n_live_tup AS estimated_live_rows,
  n_dead_tup AS estimated_dead_rows,
  pg_size_pretty(pg_table_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT schemaname, relname AS table_name, indexrelname, idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

SELECT action, count(*) AS rows, min(created_at) AS oldest, max(created_at) AS newest
FROM public.audit_logs GROUP BY action ORDER BY count(*) DESC LIMIT 25;

SELECT 'otp_verifications' AS table_name, count(*) AS total,
  count(*) FILTER (WHERE expires_at < now() - interval '1 day') AS cleanup_eligible
FROM public.otp_verifications
UNION ALL
SELECT 'password_resets', count(*),
  count(*) FILTER (WHERE expires_at < now() - interval '1 day') FROM public.password_resets;

-- Requires pg_stat_statements (Supabase normally installs it in extensions).
-- Statements are cumulative since the last stats reset; compare call/time deltas.
SELECT calls, round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  rows, left(query, 300) AS query
FROM extensions.pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
