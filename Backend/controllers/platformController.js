import supabase from "../config/supabase.js"
import { createCachedLoader } from "../utils/cachedLoader.js"

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Founder-level platform metrics. Not clinic-scoped — protected by a
 * shared secret (INTERNAL_METRICS_KEY), never by clinic auth.
 */
async function loadPlatformMetrics() {
  const now = new Date()

  // Aggregate in PostgreSQL: raw row downloads were truncated by the Data API
  // row cap and repeatedly transferred the entire appointment history.
  const { data, error } = await supabase.rpc("platform_metrics", {
    p_now: now.toISOString(),
    p_date: localDateStr(now),
  })
  if (error) throw error
  return data
}

// Coalesce concurrent dashboard/digest requests; keep at most one snapshot.
export const computePlatformMetrics = createCachedLoader(loadPlatformMetrics, { ttlMs: 30_000, maxEntries: 1 })

export const getPlatformMetrics = async (req, res) => {
  try {
    const configuredKey = process.env.INTERNAL_METRICS_KEY
    if (!configuredKey) {
      return res.status(404).json({ success: false, message: "Not found" })
    }

    const providedKey = req.headers["x-internal-key"] || req.query.key
    if (providedKey !== configuredKey) {
      return res.status(401).json({ success: false, message: "Invalid key" })
    }

    const metrics = await computePlatformMetrics()
    return res.status(200).json({ success: true, data: metrics })
  } catch (error) {
    console.error("getPlatformMetrics error:", error)
    return res.status(500).json({ success: false, message: "Internal server error." })
  }
}
