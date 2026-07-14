import supabase from "../config/supabase.js"
import jwt from "jsonwebtoken"
import bcrypt from 'bcrypt'
import { logAppointmentEvent } from "../utils/appointmentEvents.js"

// NOTE: createDoctor was removed — it lacked clinic_id support.
// Use doctorManagement.createDoctorForClinic instead.

export const doctorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email, password is required !!" })
        }

        // Fetch doctor with password
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('*')
            .eq('email', email)
            .single()

        if (error || !doctor) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        if (!doctor.is_active) {
            return res.status(403).json({ success: false, message: "Your account has been deactivated. Contact admin." })
        }

        const isMatch = await bcrypt.compare(password, doctor.password)

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email or password" })
        }

        const token = jwt.sign(
            { id: doctor.id, role: 'doctor', email: doctor.email, clinic_id: doctor.clinic_id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        return res.status(200).json({
            success: true,
            token,
            first_login: doctor.first_login,
            doctor: {
                id: doctor.id,
                fullName: doctor.full_name,
                email: doctor.email,
                specialization: doctor.specialization,
                qualification: doctor.qualification,
                clinic_id: doctor.clinic_id
            }
        })
    }
    catch (error) {
        console.error("Error while login the doctor", error.stack)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const doctorId = req.doctor.id

        // 1. Validate inputs
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required.'
            })
        }

        // 2. Basic password strength check
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.'
            })
        }

        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter and one number.'
            })
        }

        // 3. Fetch doctor with password
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', doctorId)
            .single()

        if (fetchError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' })
        }

        // 4. Verify current password is correct
        const isMatch = await bcrypt.compare(currentPassword, doctor.password)
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            })
        }

        // 5. Make sure new password is different from current
        const isSame = await bcrypt.compare(newPassword, doctor.password)
        if (isSame) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.'
            })
        }

        // 6. Hash new password + update
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        const { data: updatedDoctor, error: updateError } = await supabase
            .from('doctors')
            .update({
                password: hashedPassword,
                first_login: false
            })
            .eq('id', doctorId)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully. You can now access your dashboard.',
        })

    } catch (err) {
        console.error('changePassword error:', err)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}

export const getDoctor = async (req, res) => {
    try {
        const { email } = req.query;

        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('id, full_name, email, specialization, qualification, is_active')
            .eq('email', email)
            .single()

        if (error || !doctor) {
            return res.status(400).json({ success: false, message: "Doctor not found" })
        }

        return res.status(200).json({ message: "Doctor found", data: doctor })

    } catch (error) {
        console.error("Error while fetching doctor", error)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const getAllDoctors = async (req, res) => {
    try {
        // Patient-facing route — must be accessed via a clinic subdomain
        const clinicId = req.tenant?.id

        if (!clinicId) {
            return res.status(400).json({
                success: false,
                message: "Clinic context is required. Access through your clinic subdomain."
            })
        }

        // select("*") + whitelist: optional columns (consultation_fee) work
        // with or without migration 008; the join pulls each doctor's REAL
        // weekly schedule so the UI can show honest availability.
        const { data: doctors, error } = await supabase
            .from('doctors')
            .select('*, doctor_schedules(working_days, start_time, end_time)')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)

        if (error) throw error

        const data = (doctors || []).map(d => {
            const schedule = Array.isArray(d.doctor_schedules) ? d.doctor_schedules[0] : d.doctor_schedules
            return {
                id: d.id,
                full_name: d.full_name,
                specialization: d.specialization,
                qualification: d.qualification,
                consultation_fee: d.consultation_fee ?? null,
                is_active: d.is_active,
                created_at: d.created_at,
                working_days: schedule?.working_days || null,
                consult_hours: schedule ? { start: schedule.start_time, end: schedule.end_time } : null,
            }
        })

        return res.status(200).json({ message: "All doctors fetched", data })
    }
    catch (error) {
        console.error("Error while fetching doctors", error)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.doctor.id

        // Default to the server's local date (frontend normally sends one)
        const now = new Date()
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const date = req.query.date || localToday

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patients (name, email, phone)
            `)
            .eq('doctor_id', doctorId)
            .eq('appointment_date', date)
            .neq('status', 'cancelled')
            .order('appointment_time', { ascending: true })

        if (error) throw error

        // Summary of appointments
        const total = appointments.length
        const completed = appointments.filter(a => a.status === "completed").length
        const pending = appointments.filter(a => a.status === "pending").length
        const noShow = appointments.filter(a => a.status === "no_show").length

        return res.status(200).json({
            success: true,
            date,
            summary: {
                total,
                completed,
                pending,
                noShow,
                data: appointments.map(a => ({
                    id: a.id,
                    patient: {
                        name: a.patients?.name,
                        email: a.patients?.email,
                        phone: a.patients?.phone,
                    },
                    appointment_time: a.appointment_time,
                    status: a.status,
                    notes: a.notes
                }))
            }
        })

    }
    catch (error) {
        console.error("Error while getting the doctor appointments: ", error.stack)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

/**
 * Doctor's patient roster — every patient who has booked with this doctor
 * at this clinic, with total sessions, last visit, and last session notes.
 * Scoped to the doctor's own id + clinic_id from the JWT.
 */
export const getDoctorPatients = async (req, res) => {
    try {
        const doctorId = req.doctor.id
        const clinicId = req.doctor.clinic_id

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id, patient_id, appointment_date, appointment_time, status, notes,
                patients (id, name, email, phone),
                session_notes (notes, diagnosis, prescription, follow_up_date, updated_at)
            `)
            .eq('doctor_id', doctorId)
            .eq('clinic_id', clinicId)
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false })

        if (error) throw error

        // Aggregate appointments per patient (already sorted latest-first)
        const byPatient = new Map()
        for (const appt of appointments || []) {
            if (!appt.patients) continue
            let entry = byPatient.get(appt.patient_id)
            if (!entry) {
                const sessionNote = Array.isArray(appt.session_notes) ? appt.session_notes[0] : appt.session_notes
                entry = {
                    patient: {
                        id: appt.patients.id,
                        name: appt.patients.name,
                        email: appt.patients.email,
                        phone: appt.patients.phone,
                    },
                    total_appointments: 0,
                    completed_sessions: 0,
                    upcoming: 0,
                    last_visit: {
                        date: appt.appointment_date,
                        time: appt.appointment_time,
                        status: appt.status,
                    },
                    last_notes: sessionNote
                        ? {
                            notes: sessionNote.notes,
                            diagnosis: sessionNote.diagnosis,
                            prescription: sessionNote.prescription,
                            follow_up_date: sessionNote.follow_up_date,
                        }
                        : null,
                }
                byPatient.set(appt.patient_id, entry)
            }
            entry.total_appointments += 1
            if (appt.status === 'completed') entry.completed_sessions += 1
            if (appt.status === 'confirmed') entry.upcoming += 1
            // Latest appointment may have no notes yet — fall back to the
            // most recent one that does
            if (!entry.last_notes) {
                const sessionNote = Array.isArray(appt.session_notes) ? appt.session_notes[0] : appt.session_notes
                if (sessionNote) {
                    entry.last_notes = {
                        notes: sessionNote.notes,
                        diagnosis: sessionNote.diagnosis,
                        prescription: sessionNote.prescription,
                        follow_up_date: sessionNote.follow_up_date,
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            data: [...byPatient.values()],
        })
    }
    catch (error) {
        console.error("getDoctorPatients error:", error.stack)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}

export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const doctorId = req.doctor.id;

        const allowedStatuses = ['completed', 'no_show']
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either completed or no_show'
            })
        }

        // Get appointment with ownership check
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('doctor_id', doctorId)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (['completed', 'no_show'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Appointment is already marked as ${appointment.status}.`
            })
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Can not update a cancelled appointment.'
            })
        }

        // Update appointment status
        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        logAppointmentEvent(updated.id, appointment.clinic_id, status, {
            by: 'doctor',
        })

        return res.status(200).json({
            success: true,
            message: `Appointment marked as ${status}.`,
            data: {
                id: updated.id,
                status: updated.status
            }
        })
    }
    catch (error) {
        console.error("Error while updating the appointment status: ", error.stack)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}