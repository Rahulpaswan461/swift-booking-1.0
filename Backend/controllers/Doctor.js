import { emailLookup } from '../utils/emailLookup.js'
import { getRosterPage } from '../services/doctorRoster.js'
import { notifyAppointmentChange } from "../realtime/server.js"
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
            .ilike('email', emailLookup(email))
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
            .ilike('email', emailLookup(email))
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

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
            return res.status(400).json({ success: false, message: 'Please provide a valid appointment date.' })
        }
        // Fetch only this day and the fields rendered by the dashboard. Paging
        // also avoids silently losing rows to the Supabase Data API row cap.
        const appointments = []
        const pageSize = 500
        for (let offset = 0; ; offset += pageSize) {
            const { data: rows, error } = await supabase
                .from('appointments')
                .select('id, patient_id, appointment_date, appointment_time, status, notes, patients(id, name, email, phone)')
                .eq('doctor_id', doctorId)
                .eq('clinic_id', req.doctor.clinic_id)
                .eq('appointment_date', date)
                .neq('status', 'cancelled')
                .order('appointment_time', { ascending: true })
                .order('id', { ascending: true })
                .range(offset, offset + pageSize - 1)
            if (error) throw error
            appointments.push(...(rows || []))
            if (!rows || rows.length < pageSize) break
        }
        res.set('Cache-Control', 'no-store')

        // Summary of appointments
        const total = appointments.length
        const completed = appointments.filter(a => a.status === "completed").length
        const pending = appointments.filter(a => a.status === "confirmed").length
        const noShow = appointments.filter(a => a.status === "no_show").length

        return res.status(200).json({
            success: true,
            date,
            summary: {
                total,
                completed,
                pending,
                noShow,
                no_show: noShow,
                data: appointments.map(a => ({
                    id: a.id,
                    appointment_date: a.appointment_date,
                    patient: {
                        id: a.patient_id,
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

        const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1))
        const pageSize = 25
        const search = String(req.query.search || '').trim().slice(0, 100)
        const result = await getRosterPage({ clinicId, doctorId, page, search, pageSize })
        res.set('Cache-Control', 'no-store')
        return res.status(200).json({ success: true, ...result })
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
            .eq('clinic_id', req.doctor.clinic_id)
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

        notifyAppointmentChange(updated, status)
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