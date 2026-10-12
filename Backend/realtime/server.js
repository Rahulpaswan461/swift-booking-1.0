import { EventEmitter } from 'node:events'
import { Server } from 'socket.io'
import { randomUUID } from 'node:crypto'

export const doctorRoom = (clinicId, doctorId) => `doctor:${clinicId}:${doctorId}`
export const adminRoom = clinicId => `admin:${clinicId}`
const TYPES = new Set(['booked', 'cancelled', 'rescheduled', 'completed', 'no_show', 'notes_updated'])
export const appointmentChanges = new EventEmitter()
let activeServer

// Dependencies are injected so socket isolation/reconnect tests never use Supabase.
export function createRealtimeServer(httpServer, { authenticate, allowedOrigin }) {
  const io = new Server(httpServer, {
    transports: ['websocket'],
    maxHttpBufferSize: 8192,
    pingInterval: 25_000,
    pingTimeout: 20_000,
    allowRequest: (req, cb) => cb(null, allowedOrigin(req.headers.origin)),
    cors: { origin: (origin, cb) => cb(null, allowedOrigin(origin)) },
  })
  io.use(async (socket, next) => {
    try {
      socket.data.identity = await authenticate(socket.handshake.auth?.token)
      next()
    } catch (cause) {
      const error = new Error(cause.message || 'Unable to connect')
      error.data = { code: cause.code || 'unavailable', reason: cause.reason }
      next(error)
    }
  })
  io.on('connection', socket => {
    const { id, role, clinic_id, exp } = socket.data.identity
    socket.join(role === 'admin' ? adminRoom(clinic_id) : doctorRoom(clinic_id, id))
    const timer = setTimeout(() => {
      socket.emit('session:expired')
      socket.disconnect(true)
    }, Math.max(0, Math.min(exp * 1000 - Date.now(), 2_147_483_647)))
    timer.unref()
    socket.on('disconnect', () => clearTimeout(timer))
    // Revalidate active accounts periodically without adding writes or heartbeat DB reads.
    let stopped = false
    let accessTimer
    const recheck = async () => {
      try {
        await authenticate(socket.handshake.auth?.token)
      } catch (cause) {
        socket.emit('session:unavailable', { code: cause.code || 'unavailable', reason: cause.reason })
        socket.disconnect(true)
      } finally {
        if (!stopped) {
          accessTimer = setTimeout(recheck, 5 * 60_000)
          accessTimer.unref()
        }
      }
    }
    accessTimer = setTimeout(recheck, 5 * 60_000)
    accessTimer.unref()
    socket.on('disconnect', () => { stopped = true; clearTimeout(accessTimer) })
  })
  activeServer = io
  return io
}

// Best effort notification of an already committed mutation. Canonical data
// remains in REST; reconnect/focus resync repairs events missed during downtime.
export function notifyAppointmentChange(appointment, type, { previousDate } = {}) {
  if (!TYPES.has(type) || !appointment?.id || !appointment.doctor_id || !appointment.clinic_id) return
  try {
    appointmentChanges.emit('changed', appointment)
    if (!activeServer) return
    activeServer.to(doctorRoom(appointment.clinic_id, appointment.doctor_id)).to(adminRoom(appointment.clinic_id)).emit('appointment:changed', {
      eventId: randomUUID(),
      appointmentId: appointment.id,
      type,
      date: appointment.appointment_date,
      previousDate: previousDate || null,
      occurredAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Appointment notification failed:', error.message)
  }
}
