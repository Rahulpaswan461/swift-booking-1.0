import supabase from "../config/supabase.js"
import { sendBookingConfirmationEmail } from "../services/emailService.js"
import crypto from 'crypto'

export const bookAppointment = async (req, res) => {
    try {
        const { fullName, email, phone, date_of_birth, appointment_date, appointment_time, doctor_id, notes } = req.body;

        if (!fullName || !phone || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ success: false, message: "Please fill all the fields" })
        }

        // Check if doctor exists and is active
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, full_name, specialization')
            .eq('id', doctor_id)
            .eq('is_active', true)
            .single()

        if (doctorError || !doctor) {
            return res.status(400).json({ success: false, message: "Doctor not found or unavailable" })
        }

        // Upsert patient (create or update by email)
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .upsert(
                {
                    email,
                    full_name: fullName,
                    phone,
                    date_of_birth
                },
                { onConflict: 'email' }
            )
            .select()
            .single()

        if (patientError || !patient) {
            console.error("Patient error:", patientError)
            return res.status(400).json({ success: false, message: "Failed to create/update patient" })
        }

        // Create appointment
        const cancel_token = crypto.randomBytes(32).toString('hex')

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                patient_id: patient.id,
                doctor_id: doctor.id,
                appointment_date,
                appointment_time,
                status: 'confirmed',
                notes: notes || '',
                cancel_token
            })
            .select()
            .single()

        if (appointmentError || !appointment) {
            console.error("Appointment error:", appointmentError)
            return res.status(400).json({ success: false, message: "Appointment not created" })
        }

        // Send confirmation email
        const result = await sendBookingConfirmationEmail({ appointment, patient, doctor })
        console.info("email status: ", result)

        if (!result) {
            return res.status(400).json({ success: false, message: "Email not sent" })
        }

        return res.status(200).json({
            success: true,
            message: "Appointment created successfully",
            data: {
                appointment_id: appointment.id,
                patient_name: patient.full_name,
                doctor: doctor.full_name,
                specialization: doctor.specialization,
                appointment_date,
                appointment_time
            }
        })

    }
    catch (error) {
        console.error("Booking appointment error", error)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const getAppointment = async (req, res) => {
    try {
        const { id: appointment_id } = req.params;
        if (!appointment_id) {
            return res.status(400).json({ success: false, message: "Please provide appointment id" })
        }

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointment_id)
            .single()

        if (error || !appointment) {
            return res.status(400).json({ success: false, message: "Appointment not found" })
        }

        return res.status(200).json(appointment)
    }
    catch (error) {
        console.error("Error while fetching appointment", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const cancelAppointment = async (req, res) => {
    try {
        const { id: appointment_id } = req.params;
        if (!appointment_id) {
            return res.status(400).json({ success: false, message: "Please provide appointment id" })
        }

        const { data: appointment, error } = await supabase
            .from('appointments')
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq('id', appointment_id)
            .select()
            .single()

        if (error || !appointment) {
            return res.status(400).json({ success: false, message: "Appointment not found" })
        }

        return res.status(200).json({ message: "Appointment cancelled successfully" })
    }
    catch (error) {
        console.error("Error while canceling appointment", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const cancelAppointmentWithToken = async (req, res) => {
    try {
        const { id: appointment_id, token: cancel_token } = req.params;
        if (!appointment_id || !cancel_token) {
            return res.status(400).json({ success: false, message: "Invalid cancellation link" })
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointment_id)
            .eq('cancel_token', cancel_token)
            .single()

        if (fetchError || !appointment) {
            return res.status(400).json({ success: false, message: "Invalid or expired cancellation link" })
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({ success: false, message: "Appointment is already cancelled" })
        }

        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq('id', appointment_id)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json({ success: true, message: "Appointment cancelled successfully" })
    } catch (error) {
        console.error("Error while canceling appointment with token", error)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}