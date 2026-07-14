import supabase from "../config/supabase.js"
import { sendBookingConfirmationEmail, sendRescheduleConfirmationEmail, sendCancellationEmail } from "../services/emailService.js"
import { logAppointmentEvent } from "../utils/appointmentEvents.js"
import { sendBookingConfirmationSms } from "../services/smsService.js"
import crypto from "crypto"

export const bookAppointment = async (req, res) => {
    try {
        const clinicId = req.tenant?.id
        const patient_id = req.patient?.patient_id

        if (!clinicId) {
            return res.status(400).json({
                success: false,
                message: 'Clinic context is required. Access through your clinic subdomain.'
            })
        }

        if (!patient_id) {
            return res.status(401).json({
                success: false,
                message: 'You must verify your identity first.'
            })
        }

        const { fullName, phone, date_of_birth, doctor_id, appointment_date, appointment_time, notes } = req.body;

        if (!fullName || !phone || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            })
        }

        // Verify the doctor belongs to this clinic
        const { data: doctorCheck } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctor_id)
            .single()

        if (!doctorCheck || doctorCheck.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This doctor does not belong to the selected clinic'
            })
        }

        // Update patient info (name, phone) if provided
        if (fullName || phone) {
            const updateData = {}
            if (fullName) updateData.name = fullName
            if (phone) updateData.phone = phone
            if (date_of_birth) updateData.date_of_birth = date_of_birth

            await supabase
                .from('patients')
                .update(updateData)
                .eq('id', patient_id)
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

        // Create appointment — clinic_id derived from tenant, never from request body
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                clinic_id: clinicId,
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

        logAppointmentEvent(appointment.id, clinicId, "booked", {
            date: appointment_date,
            time: appointment_time,
        })

        // Send confirmation in the background via the channel the patient
        // verified with — email → email, phone → SMS (both when possible)
        if (patient?.email) {
            sendBookingConfirmationEmail({
                appointment,
                patient,
                doctor,
                clinic: req.tenant
            }).catch(err => console.error("Email failed:", err.message))
        }
        if (req.patient?.contact_type === 'phone' && (patient?.phone || phone)) {
            sendBookingConfirmationSms({
                appointment: { ...appointment, patient_phone: patient?.phone || phone },
                doctor,
                clinic: req.tenant
            }).catch(err => console.error("SMS failed:", err.message))
        }

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
        const clinicId = req.tenant?.id

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, name, email, phone),
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

        // Tenant isolation: appointment must belong to the resolved clinic
        if (clinicId && appointment.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This appointment does not belong to your clinic'
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
        const clinicId = req.tenant?.id

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*, patient:patients(*), doctor:doctors(*)')
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        // Tenant isolation: appointment must belong to the resolved clinic
        if (clinicId && appointment.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This appointment does not belong to your clinic'
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

        logAppointmentEvent(appointment.id, appointment.clinic_id, "cancelled", {
            date: appointment.appointment_date,
            time: appointment.appointment_time,
        })

        // Confirmation email in the background
        if (appointment.patient?.email) {
            sendCancellationEmail({
                appointment,
                patient: appointment.patient,
                doctor: appointment.doctor,
                clinic: req.tenant
            }).catch(err => console.error("Cancellation email failed:", err.message))
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
        const clinicId = req.tenant?.id

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*, patient:patients(*), doctor:doctors(*)')
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        // Tenant isolation: appointment must belong to the resolved clinic
        if (clinicId && appointment.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This appointment does not belong to your clinic'
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

        logAppointmentEvent(appointment.id, appointment.clinic_id, "cancelled", {
            date: appointment.appointment_date,
            time: appointment.appointment_time,
        })

        // Confirmation email in the background
        if (appointment.patient?.email) {
            sendCancellationEmail({
                appointment,
                patient: appointment.patient,
                doctor: appointment.doctor,
                clinic: req.tenant
            }).catch(err => console.error("Cancellation email failed:", err.message))
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

        logAppointmentEvent(appointment.id, appointment.clinic_id, "rescheduled", {
            from_date: appointment.appointment_date,
            from_time: appointment.appointment_time,
            to_date: appointment_date,
            to_time: appointment_time,
        })

        // Send reschedule confirmation in the background
        sendRescheduleConfirmationEmail({
            appointment: { ...appointment, appointment_date, appointment_time },
            oldTime,
            patient: appointment.patient,
            doctor: appointment.doctor,
            clinic: req.tenant
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
