import supabase from "../config/supabase.js"
import { sendBookingConfirmationEmail, sendRescheduleConfirmationEmail } from "../services/emailService.js"
import crypto from "crypto"

export const bookAppointment = async (req, res) => {
    try {
        const { fullName, phone, date_of_birth, doctor_id, appointment_date, appointment_time, notes } = req.body;

        if (!fullName || !phone || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            })
        }

        const email = req.body.email || localStorage?.getItem?.('otp_email')
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            })
        }

        // Get or create patient
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('email', email)
            .single()

        let patient_id = existingPatient?.id

        if (!patient_id) {
            const { data: newPatient, error: patientError } = await supabase
                .from('patients')
                .insert({
                    email,
                    full_name: fullName,
                    phone,
                    date_of_birth,
                })
                .select('id')
                .single()

            if (patientError) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to create patient record'
                })
            }
            patient_id = newPatient.id
        }

        // Check if slot is already booked
        const { data: existingAppointment } = await supabase
            .from('appointments')
            .select('id')
            .eq('doctor_id', doctor_id)
            .eq('appointment_date', appointment_date)
            .eq('appointment_time', appointment_time)
            .eq('status', 'confirmed')
            .single()

        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'This slot is no longer available'
            })
        }

        // Generate cancel token
        const cancel_token = crypto.randomBytes(32).toString('hex')

        // Create appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                notes: notes || '',
                status: 'confirmed',
                cancel_token
            })
            .select('*')
            .single()

        if (appointmentError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to book appointment'
            })
        }

        // Fetch doctor and patient for email
        const { data: doctor } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', doctor_id)
            .single()

        const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patient_id)
            .single()

        // Send confirmation email
        await sendBookingConfirmationEmail({
            appointment,
            patient,
            doctor
        }).catch(err => console.error("Email failed:", err.message))

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: appointment
        })
    } catch (error) {
        console.error('Error booking appointment:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export const getAppointment = async (req, res) => {
    try {
        const { id } = req.params

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, full_name, email, phone),
                doctor:doctors(id, full_name, specialization)
            `)
            .eq('id', id)
            .single()

        if (error || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        return res.status(200).json({
            success: true,
            data: appointment
        })
    } catch (error) {
        console.error('Error fetching appointment:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params
        const { cancel_token } = req.body

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (appointment.cancel_token !== cancel_token) {
            return res.status(403).json({
                success: false,
                message: 'Invalid cancellation token'
            })
        }

        // Update appointment status
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', id)

        if (updateError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to cancel appointment'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully'
        })
    } catch (error) {
        console.error('Error canceling appointment:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export const cancelAppointmentWithToken = async (req, res) => {
    try {
        const { id, token } = req.params

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (appointment.cancel_token !== token) {
            return res.status(403).json({
                success: false,
                message: 'Invalid cancellation token'
            })
        }

        // Update appointment status
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', id)

        if (updateError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to cancel appointment'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully'
        })
    } catch (error) {
        console.error('Error canceling appointment:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export const rescheduleAppointment = async (req, res) => {
    try {
        const { id, token } = req.params
        const { appointment_date, appointment_time } = req.body

        if (!appointment_date || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: 'New appointment date and time are required'
            })
        }

        // Validate that new date is not in the past
        const today = new Date().toISOString().split('T')[0]
        if (appointment_date < today) {
            return res.status(400).json({
                success: false,
                message: 'Cannot reschedule to a past date. Please select today or a future date.'
            })
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(*),
                doctor:doctors(*)
            `)
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (appointment.cancel_token !== token) {
            return res.status(403).json({
                success: false,
                message: 'Invalid rescheduling token'
            })
        }

        if (appointment.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Only confirmed appointments can be rescheduled'
            })
        }

        // Check if new slot is available
        const { data: existingAppointment } = await supabase
            .from('appointments')
            .select('id')
            .eq('doctor_id', appointment.doctor_id)
            .eq('appointment_date', appointment_date)
            .eq('appointment_time', appointment_time)
            .eq('status', 'confirmed')
            .neq('id', id)
            .single()

        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'This slot is no longer available'
            })
        }

        // Store old time for email
        const oldTime = appointment.appointment_time

        // Update appointment
        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                appointment_date,
                appointment_time
            })
            .eq('id', id)

        if (updateError) {
            return res.status(400).json({
                success: false,
                message: 'Failed to reschedule appointment'
            })
        }

        // Send reschedule confirmation email
        await sendRescheduleConfirmationEmail({
            appointment: { ...appointment, appointment_date, appointment_time },
            oldTime,
            patient: appointment.patient,
            doctor: appointment.doctor
        }).catch(err => console.error("Email failed:", err.message))

        return res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: { ...appointment, appointment_date, appointment_time }
        })
    } catch (error) {
        console.error('Error rescheduling appointment:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}
