import supabase from "../config/supabase.js"

/**
 * Best-effort append to the appointment lifecycle trail
 * (booked / rescheduled / cancelled / completed / no_show).
 * Never throws — a missing table (migration 009 not applied) or a
 * transient failure must not break the booking flow itself.
 */
export async function logAppointmentEvent(appointmentId, clinicId, eventType, details = null) {
  try {
    const { error } = await supabase.from("appointment_events").insert({
      appointment_id: appointmentId,
      clinic_id: clinicId,
      event_type: eventType,
      details,
    })
    if (error && !/appointment_events/i.test(error.message || "")) {
      console.error("appointment event log failed:", error.message)
    }
  } catch (err) {
    console.error("appointment event log failed:", err.message)
  }
}

/**
 * Fetch lifecycle events for a set of appointments, oldest first.
 * Returns {} when the events table doesn't exist yet.
 */
export async function getAppointmentEvents(appointmentIds) {
  try {
    if (!appointmentIds?.length) return {}
    const { data, error } = await supabase
      .from("appointment_events")
      .select("appointment_id, event_type, details, created_at")
      .in("appointment_id", appointmentIds)
      .order("created_at", { ascending: true })
    if (error) return {}
    const byAppointment = {}
    for (const ev of data || []) {
      ;(byAppointment[ev.appointment_id] ||= []).push(ev)
    }
    return byAppointment
  } catch {
    return {}
  }
}
