import supabase from "../config/supabase.js"
import { getAppointmentEvents } from "../utils/appointmentEvents.js"

/**
 * Create or update session notes for an appointment
 * Only the doctor who conducted the appointment can add notes
 */
export const createSessionNotes = async (req, res) => {
    try {
        const doctorId = req.doctor.id
        const clinicId = req.doctor.clinic_id
        const { appointment_id } = req.params
        const { notes, diagnosis, prescription, follow_up_date, tags } = req.body

        if (!notes || !notes.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Session notes are required'
            })
        }

        // Visit tags: up to 6 short labels, trimmed and deduplicated
        let cleanTags
        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ success: false, message: 'tags must be an array of short labels' })
            }
            cleanTags = [...new Set(tags.map(t => String(t).trim()).filter(Boolean))].slice(0, 6)
            if (cleanTags.some(t => t.length > 30)) {
                return res.status(400).json({ success: false, message: 'Each tag must be 30 characters or fewer' })
            }
        }

        // Verify appointment belongs to this doctor and clinic
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('id, doctor_id, clinic_id, status')
            .eq('id', appointment_id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (appointment.doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: 'You can only add notes for your own appointments'
            })
        }

        if (appointment.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This appointment does not belong to your clinic'
            })
        }

        // Upsert session notes (insert or update)
        const noteData = {
            appointment_id,
            doctor_id: doctorId,
            clinic_id: clinicId,
            notes: notes.trim(),
            diagnosis: diagnosis ? diagnosis.trim() : null,
            prescription: prescription ? prescription.trim() : null,
            follow_up_date: follow_up_date || null,
            updated_at: new Date().toISOString()
        }
        if (cleanTags !== undefined) noteData.tags = cleanTags

        let { data: sessionNote, error: noteError } = await supabase
            .from('session_notes')
            .upsert(noteData, { onConflict: 'appointment_id' })
            .select()
            .single()

        // Pre-migration-011 schema has no tags column — retry without
        if (noteError && cleanTags !== undefined && /tags/i.test(noteError.message || '')) {
            console.warn('session_notes.tags column missing — run migration 011. Saving without tags.')
            delete noteData.tags
            ;({ data: sessionNote, error: noteError } = await supabase
                .from('session_notes')
                .upsert(noteData, { onConflict: 'appointment_id' })
                .select()
                .single())
        }

        if (noteError) {
            console.error('createSessionNotes error:', noteError)
            return res.status(500).json({
                success: false,
                message: 'Failed to save session notes'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Session notes saved successfully',
            data: sessionNote
        })
    } catch (error) {
        console.error('createSessionNotes error:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

/**
 * Get session notes for an appointment
 * Only the treating doctor can view notes
 */
export const getSessionNotes = async (req, res) => {
    try {
        const doctorId = req.doctor.id
        const { appointment_id } = req.params

        // Verify appointment belongs to this doctor
        const { data: appointment } = await supabase
            .from('appointments')
            .select('doctor_id')
            .eq('id', appointment_id)
            .single()

        if (!appointment || appointment.doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            })
        }

        const { data: sessionNote, error } = await supabase
            .from('session_notes')
            .select('*')
            .eq('appointment_id', appointment_id)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('getSessionNotes error:', error)
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            })
        }

        return res.status(200).json({
            success: true,
            data: sessionNote || null
        })
    } catch (error) {
        console.error('getSessionNotes error:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

/**
 * Get patient appointment history
 * Patient can view their own past and upcoming appointments
 */
export const getPatientHistory = async (req, res) => {
    try {
        const patientId = req.patient?.patient_id
        const clinicId = req.tenant?.id

        if (!patientId) {
            return res.status(401).json({
                success: false,
                message: 'You must verify your identity first'
            })
        }

        // Never run the history query without a resolved clinic — otherwise the
        // clinic_id filter would be `undefined` and the results would not be
        // scoped to a single clinic. Patients must reach this via their clinic.
        if (!clinicId) {
            return res.status(400).json({
                success: false,
                message: 'Open this clinic through its own link to see your appointments.'
            })
        }

        const { data: rawAppointments, error } = await supabase
            .from('appointments')
            .select(`
                *,
                doctor:doctors(id, full_name, specialization, qualification),
                session_notes(*)
            `)
            .eq('patient_id', patientId)
            .eq('clinic_id', clinicId)
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false })

        if (error) {
            console.error('getPatientHistory error:', error)
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            })
        }

        // Preserve the legacy shape the UI reads ({ session_notes: <id>, ... })
        const appointments = (rawAppointments || []).map(a => {
            const rawNote = Array.isArray(a.session_notes) ? a.session_notes[0] : a.session_notes
            return { ...a, session_notes: rawNote ? { ...rawNote, session_notes: rawNote.id } : null }
        })

        // Separate upcoming and past appointments
        const today = new Date().toISOString().split('T')[0]
        const upcoming = appointments
            .filter(a => a.appointment_date >= today && a.status !== 'cancelled')
            .sort((a, b) => {
                if (a.appointment_date === b.appointment_date) {
                    return a.appointment_time.localeCompare(b.appointment_time)
                }
                return a.appointment_date.localeCompare(b.appointment_date)
            })
        const past = appointments
            .filter(a => a.appointment_date < today || a.status === 'cancelled' || a.status === 'completed')

        return res.status(200).json({
            success: true,
            data: {
                upcoming,
                past,
                total: appointments.length
            }
        })
    } catch (error) {
        console.error('getPatientHistory error:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

/**
 * Get patient appointment history with session notes
 * Doctor can view all appointments for a patient with their notes
 */
export const getPatientHistoryWithNotes = async (req, res) => {
    try {
        const doctorId = req.doctor.id
        const clinicId = req.doctor.clinic_id
        const { patient_id } = req.params

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, name, email, phone, date_of_birth),
                session_notes(*)
            `)
            .eq('patient_id', patient_id)
            .eq('clinic_id', clinicId)
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false })

        if (error) {
            console.error('getPatientHistoryWithNotes error:', error)
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            })
        }

        // Lifecycle trail (booked / rescheduled / cancelled / completed)
        const eventsByAppointment = await getAppointmentEvents(appointments.map(a => a.id))
        const withEvents = appointments.map(a => {
            // Preserve the legacy shape the UI reads ({ session_notes: <id>, ... })
            const rawNote = Array.isArray(a.session_notes) ? a.session_notes[0] : a.session_notes
            return {
                ...a,
                session_notes: rawNote ? { ...rawNote, session_notes: rawNote.id } : null,
                events: eventsByAppointment[a.id] || [],
            }
        })

        // Patient summary: visit reasons aggregated from tags across all notes
        const visitTags = [...new Set(
            withEvents.flatMap(a => a.session_notes?.tags || [])
        )]

        const completed = appointments.filter(a => a.status === 'completed').length
        const cancelled = appointments.filter(a => a.status === 'cancelled').length
        const noShow = appointments.filter(a => a.status === 'no_show').length

        return res.status(200).json({
            success: true,
            data: {
                patient: appointments[0]?.patient,
                summary: {
                    total: appointments.length,
                    completed,
                    cancelled,
                    no_show: noShow,
                    visit_tags: visitTags,
                },
                appointments: withEvents,
                total: appointments.length
            }
        })
    } catch (error) {
        console.error('getPatientHistoryWithNotes error:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}
