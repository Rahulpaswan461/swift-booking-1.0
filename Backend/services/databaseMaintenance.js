import supabase from "../config/supabase.js"
import createLogger from "../utils/logger.js"

const log = createLogger("database-maintenance")

// Bounded batches and an advisory transaction lock in the RPC keep maintenance
// lightweight even when several backend instances run this scheduler.
export async function cleanExpiredAuthRecords() {
  const { data, error } = await supabase.rpc("cleanup_expired_auth_records", { p_batch_size: 1000 })
  if (error) {
    const missingFunction = ["PGRST202", "42883"].includes(error.code)
    log.error(missingFunction
      ? "Expired-code cleanup unavailable: apply Backend/migrations/017_repair_audit_and_auth_cleanup.sql to the Supabase project configured by SUPABASE_URL"
      : "Expired-code cleanup failed", { code: error.code, error: error.message })
    return
  }
  if (data?.otp_verifications || data?.password_resets) log.info("Expired codes removed", data)
}

export function startDatabaseMaintenanceJob() {
  if (process.env.ENABLE_DB_MAINTENANCE === "false") return
  const schedule = (delay) => {
    const timer = setTimeout(async () => {
      try { await cleanExpiredAuthRecords() }
      catch (error) { log.error("Maintenance failed", { error: error.message }) }
      finally { schedule(60 * 60 * 1000) }
    }, delay)
    timer.unref()
  }
  schedule(60_000)
}
