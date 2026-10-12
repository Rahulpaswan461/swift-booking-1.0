import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

// HTTP can continue using Vercel rewrites. WebSockets connect to Render directly.
const REALTIME_URL = import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? import.meta.env.VITE_DEV_REALTIME_URL || 'http://localhost:3000' : 'https://swift-booking-1-0-1.onrender.com')

export default function useAppointmentRealtime({ role = 'doctor', onChange, onResync, onAccessDenied }) {
  const callbacks = useRef({ onChange, onResync, onAccessDenied })
  callbacks.current = { onChange, onResync, onAccessDenied }
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    let blocked = false
    let disposed = false
    let retryTimer
    let retryDelay = 1500
    const seen = new Set()
    const socket = io(REALTIME_URL, {
      transports: ['websocket'],
      autoConnect: false,
      timeout: 20_000,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      auth: cb => cb({ token: localStorage.getItem(`${role}_token`) }),
    })
    const retry = () => {
      clearTimeout(retryTimer)
      if (blocked || disposed) return
      retryTimer = setTimeout(() => socket.connect(), retryDelay)
      retryDelay = Math.min(30_000, retryDelay * 2)
    }
    const block = (code, reason) => {
      callbacks.current.onAccessDenied?.(reason || null)
      blocked = true
      clearTimeout(retryTimer)
      setStatus(code === 'unauthorized' ? 'expired' : 'forbidden')
      socket.disconnect()
    }
    socket.on('connect', () => {
      retryDelay = 1500
      clearTimeout(retryTimer)
      callbacks.current.onAccessDenied?.(null)
      setStatus('live')
      callbacks.current.onResync()
    })
    socket.on('disconnect', reason => {
      if (disposed || blocked) return
      setStatus('reconnecting')
      if (reason === 'io server disconnect') retry()
    })
    socket.on('connect_error', error => {
      if (disposed) return
      const code = error.data?.code
      if (code === 'unauthorized' || code === 'forbidden') return block(code, error.data?.reason)
      setStatus('reconnecting')
      // Socket.IO retries transport failures itself, but middleware rejection
      // requires an explicit retry (e.g. temporary Supabase unavailability).
      if (!socket.active) retry()
    })
    socket.on('session:expired', () => block('unauthorized'))
    socket.on('session:unavailable', ({ code, reason } = {}) => {
      if (code === 'unauthorized' || code === 'forbidden') block(code, reason)
    })
    socket.on('appointment:changed', event => {
      if (!event?.eventId || !event.appointmentId || seen.has(event.eventId)) return
      seen.add(event.eventId)
      if (seen.size > 250) seen.delete(seen.values().next().value)
      callbacks.current.onChange(event)
    })
    const resync = () => {
      if (blocked || document.visibilityState === 'hidden') return
      callbacks.current.onResync()
      if (!socket.connected && !socket.active) socket.connect()
    }
    const storage = event => {
      if (event.key === `${role}_token` || event.key === null) {
        // Another tab signed out or changed accounts. Unmount the old private
        // dashboard before any further data can be displayed for that account.
        window.location.reload()
      }
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('online', resync)
    window.addEventListener('storage', storage)
    const fallback = setInterval(() => {
      if (!socket.connected) resync()
    }, 60_000)
    socket.connect()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      clearInterval(fallback)
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('online', resync)
      window.removeEventListener('storage', storage)
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [role])

  return status
}
