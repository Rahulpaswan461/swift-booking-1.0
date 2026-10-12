// One request at a time. Bursts collapse into one request; a change arriving
// during a request schedules one follow-up so it cannot be overwritten/lost.
export function createRefreshQueue(load, delayMs = 180, {
  shouldRetry = () => false, canRetry = () => true, retryDelays = [2000, 5000, 15_000, 60_000],
} = {}) {
  let timer = null
  let retrying = false
  let failures = 0
  let running = false
  let dirty = false
  let stopped = false
  const run = async () => {
    timer = null
    if (stopped) return
    if (retrying && !canRetry()) { retrying = false; return }
    retrying = false
    if (running) { dirty = true; return }
    running = true
    dirty = false
    try { await load(); failures = 0 }
    catch (error) {
      if (!stopped && shouldRetry(error)) {
        retrying = true
        timer = setTimeout(run, retryDelays[Math.min(failures++, retryDelays.length - 1)])
      }
    }
    finally {
      running = false
      if (dirty && !stopped) request()
    }
  }
  const request = (immediate = false) => {
    if (stopped) return
    if (running) { dirty = true; return }
    if (timer !== null) {
      if (!immediate && !retrying) return
      clearTimeout(timer)
    }
    retrying = false
    timer = setTimeout(run, immediate ? 0 : delayMs)
  }
  return { request, stop() { stopped = true; dirty = false; clearTimeout(timer) } }
}
