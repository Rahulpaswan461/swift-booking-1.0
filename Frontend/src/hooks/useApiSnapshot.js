import { useEffect, useRef, useState, useCallback } from 'react'
import { createRefreshQueue } from '../utils/refreshQueue'

// Reads stay on the authenticated API. Socket events only invalidate snapshots.
export default function useApiSnapshot(client, url, params = {}) {
  const key = JSON.stringify(params)
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const queue = useRef(null)
  useEffect(() => {
    let active = true
    let controller
    setLoading(true)
    setError(''); setErrorDetails(null)
    setUpdatedAt(null)
    const nextQueue = createRefreshQueue(async () => {
      controller = new AbortController()
      setRefreshing(true)
      try {
        const response = await client.get(url, { params: JSON.parse(key), signal: controller.signal, timeout: 90_000 })
        if (!active) return
        setSnapshot({ key, url, data: response.data })
        setUpdatedAt(new Date())
        setError(''); setErrorDetails(null)
      } catch (err) {
        if (active && err.code !== 'ERR_CANCELED') {
          setErrorDetails(err.response?.data || null)
          setError(err.response?.data?.message || 'Could not load the latest information. Please try again.')
          throw err
        }
      } finally {
        if (active) { setLoading(false); setRefreshing(false) }
      }
    }, 180, {
      shouldRetry: err => !err.response || err.response.status === 429 || err.response.status >= 500,
      canRetry: () => active && document.visibilityState !== 'hidden',
    })
    queue.current = nextQueue
    nextQueue.request(true)
    return () => { active = false; nextQueue.stop(); controller?.abort() }
  }, [client, url, key])
  const refresh = useCallback(() => queue.current?.request(), [])
  return { data: snapshot?.key === key && snapshot?.url === url ? snapshot.data : null, loading, refreshing, error, errorDetails, updatedAt, refresh }
}
