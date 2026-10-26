// Only public presentation data belongs here. Availability, sessions, payments
// and authenticated dashboard reads always use their existing live APIs.
export const PUBLIC_PAGE_TTL_MS = 60_000
export const PUBLIC_PAGE_CACHE_PREFIX = 'healibrate:public:v1:'
const paths = ['/clinic/info', '/doctors']
const clinicFields = ['id', 'name', 'slug', 'branding', 'address', 'specialization', 'operating_hours', 'is_active']
const doctorFields = ['id', 'full_name', 'specialization', 'qualification', 'consultation_fee', 'is_active', 'created_at', 'working_days', 'consult_hours']
const pick = (value, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]))

function publicData(path, data) {
  if (path === '/clinic/info') {
    if (!data || typeof data !== 'object' || !data.id) throw new Error('Invalid clinic response')
    return pick(data, clinicFields)
  }
  if (!Array.isArray(data) || data.some(doctor => !doctor || typeof doctor !== 'object' || !doctor.id)) {
    throw new Error('Invalid doctor response')
  }
  return data.map(doctor => pick(doctor, doctorFields))
}

const cancelled = () => Object.assign(new Error('Request cancelled'), { code: 'ERR_CANCELED' })
function forSubscriber(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(cancelled())
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(cancelled())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(value => {
      signal.removeEventListener('abort', onAbort)
      if (!signal.aborted) resolve(value)
    }, error => {
      signal.removeEventListener('abort', onAbort)
      if (!signal.aborted) reject(error)
    })
  })
}

export function createPublicPageCache({ storage, scope, now = Date.now }) {
  const memory = new Map()
  const pending = new Map()
  const generations = new Map()
  const keyFor = path => `${PUBLIC_PAGE_CACHE_PREFIX}${scope()}:${path}`

  function evict(key) {
    memory.delete(key)
    try { storage().removeItem(key) } catch { /* Storage is optional. */ }
  }

  function invalidate() {
    for (const path of paths) {
      const key = keyFor(path)
      generations.set(key, (generations.get(key) || 0) + 1)
      pending.delete(key)
      evict(key)
    }
  }

  async function read(path, { get, signal, force = false } = {}) {
    if (!paths.includes(path)) throw new Error('Only public clinic info and doctor profiles may be cached')
    if (signal?.aborted) throw cancelled()
    const key = keyFor(path)
    if (!force) {
      let entry
      try {
        entry = JSON.parse(storage().getItem(key) || 'null')
        if (!entry && memory.get(key)?.storageFailed) entry = memory.get(key)
      }
      catch { entry = memory.get(key) }
      if (entry && Number.isFinite(entry.savedAt) && now() >= entry.savedAt && now() - entry.savedAt < PUBLIC_PAGE_TTL_MS) {
        try { return publicData(path, entry.data) } catch { /* Refetch corrupt entries. */ }
      }
    }
    evict(key)
    let request = pending.get(key)
    if (!request) {
      const generation = generations.get(key) || 0
      // A bounded public read completes even if one subscriber unmounts. This
      // lets React StrictMode and concurrent consumers share a single request.
      request = Promise.resolve().then(() => get(path, {
        timeout: path === '/clinic/info' ? 20_000 : 30_000,
      })).then(response => {
        const data = publicData(path, response.data?.data ?? response.data)
        if ((generations.get(key) || 0) === generation) {
          const entry = { savedAt: now(), data }
          try { storage().setItem(key, JSON.stringify(entry)) }
          catch { entry.storageFailed = true }
          memory.set(key, entry)
        }
        return data
      }).finally(() => {
        if (pending.get(key) === request) pending.delete(key)
      })
      pending.set(key, request)
    }
    return forSubscriber(request, signal)
  }

  return { read, invalidate }
}

const cache = createPublicPageCache({
  storage: () => window.localStorage,
  // Include the origin and API configuration, including dev ports/backends.
  scope: () => `${window.location.origin}|${import.meta.env?.VITE_API_URL || 'same-origin'}`,
})
export const readPublicPage = (path, options) => cache.read(path, options)
export const invalidatePublicPageCache = () => cache.invalidate()

export function isPublicPageMutation(config = {}) {
  return ['post', 'patch', 'put', 'delete'].includes(config.method?.toLowerCase()) &&
    /^\/admin\/(?:clinic\/(?:branding|settings)|doctors(?:\/[^?#]*)?)(?:\?.*)?$/.test(config.url || '')
}
