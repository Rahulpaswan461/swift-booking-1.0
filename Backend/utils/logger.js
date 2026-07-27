// Lightweight structured logger for production observability.
//
// Every line is: <ISO timestamp> [LEVEL] [module] message {json meta}
// which is easy to read in a terminal and easy to grep/parse in a log
// aggregator. No dependencies.
//
// Control verbosity with LOG_LEVEL=error|warn|info|debug (default: info).
// Errors and warnings always carry enough context (ids, error codes) to
// tell you WHERE a failure happened, not just that one did.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const CURRENT = LEVELS[String(process.env.LOG_LEVEL || "info").toLowerCase()] ?? LEVELS.info

function safeMeta(meta) {
  if (meta === undefined || meta === null) return ""
  if (typeof meta !== "object") return ` ${meta}`
  const keys = Object.keys(meta)
  if (keys.length === 0) return ""
  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    // Circular or non-serializable — fall back to a shallow best-effort dump.
    try {
      return ` ${JSON.stringify(Object.fromEntries(keys.map((k) => [k, String(meta[k])])))}`
    } catch {
      return ""
    }
  }
}

function line(level, mod, msg, meta) {
  return `${new Date().toISOString()} [${level.toUpperCase()}] [${mod}] ${msg}${safeMeta(meta)}`
}

/**
 * Create a logger bound to a module name, e.g. createLogger("email").
 * Usage: const log = createLogger("email"); log.info("Sending", { to })
 */
export function createLogger(mod) {
  return {
    error: (msg, meta) => { if (CURRENT >= LEVELS.error) console.error(line("error", mod, msg, meta)) },
    warn:  (msg, meta) => { if (CURRENT >= LEVELS.warn)  console.warn(line("warn", mod, msg, meta)) },
    info:  (msg, meta) => { if (CURRENT >= LEVELS.info)  console.log(line("info", mod, msg, meta)) },
    debug: (msg, meta) => { if (CURRENT >= LEVELS.debug) console.log(line("debug", mod, msg, meta)) },
  }
}

export default createLogger
