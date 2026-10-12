/** Bounded TTL cache. Invalidation also prevents old in-flight results being cached. */
export function createCachedLoader(load, { ttlMs = 30_000, maxEntries = 100 } = {}) {
  const cache = new Map()
  const pending = new Map()
  const loader = async key => {
    const entry = cache.get(key)
    if (entry && entry.expires > Date.now()) return entry.value
    if (pending.has(key)) return pending.get(key).promise
    const task = {}
    task.promise = Promise.resolve().then(() => load(key)).then(value => {
      if (pending.get(key) === task) {
        cache.delete(key)
        while (cache.size >= maxEntries) cache.delete(cache.keys().next().value)
        cache.set(key, { value, expires: Date.now() + ttlMs })
      }
      return value
    }).finally(() => { if (pending.get(key) === task) pending.delete(key) })
    pending.set(key, task)
    return task.promise
  }
  loader.invalidate = key => { cache.delete(key); pending.delete(key) }
  return loader
}
