import { requireAvailableAppointment } from "../services/appointmentAvailability.js"
import { notifyAppointmentChange } from "../realtime/server.js"
import supabase from "../config/supabase.js"
import { sendBookingConfirmationEmail, sendRescheduleConfirmationEmail, sendCancellationEmail } from "../services/emailService.js"
import { logAppointmentEvent } from "../utils/appointmentEvents.js"
import { sendBookingConfirmationSms } from "../services/smsService.js"
import createLogger from "../utils/logger.js"
import crypto from "crypto"

const log = createLogger("appointments")

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

        const { fullName, phone, date_of_birth, doctor_id, appointment_date, appointment_time: requestedTime, notes } = req.body;

        if (!fullName || !phone || !doctor_id || !appointment_date || !requestedTime) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            })
        }

        // Verify the doctor belongs to this clinic
        const { data: doctorCheck } = await supabase
            .from('doctors')
            .select('id, clinic_id, full_name, specialization')
            .eq('id', doctor_id)
            .single()

        if (!doctorCheck || doctorCheck.clinic_id !== clinicId) {
            return res.status(403).json({
                success: false,
                message: 'This doctor does not belong to the selected clinic'
            })
        }

        const appointment_time = await requireAvailableAppointment({db:supabase,clinicId,doctorId:doctor_id,date:appointment_date,time:requestedTime,timezone:req.tenant?.timezone})

        // Update patient info (name, phone) if provided
        if (fullName || phone) {
            const updateData = {}
            if (fullName) updateData.name = fullName
            if (phone) updateData.phone = phone
            if (date_of_birth) updateData.date_of_birth = date_of_birth

            const {error: patientUpdateError} = await supabase
                .from('patients')
                .update(updateData)
                .eq('id', patient_id)
            if (patientUpdateError) return res.status(400).json({success:false,message:'Could not save your contact details. Check your phone number and try again.'})
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
            return res.status(appointmentError.code === '23505' ? 409 : 400).json({
                success: false,
                message: appointmentError.code === '23505' ? 'This slot is no longer available' : 'Failed to book appointment'
            })
        }

        // Notify immediately after the insert; email lookups do not delay the dashboard.
        notifyAppointmentChange(appointment, "booked")
        const doctor = doctorCheck
        const { data: patient } = await supabase
            .from('patients')
            .select('id, name, email, phone')
            .eq('id', patient_id)
            .single()

        logAppointmentEvent(appointment.id, clinicId, "booked", {
            date: appointment_date,
            time: appointment_time,
        })

        log.info("Appointment booked", {
            appointmentId: appointment.id,
            clinicId,
            doctorId: doctor_id,
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
            }).catch(err => log.error("Booking confirmation email FAILED", { appointmentId: appointment.id, clinicId, error: err.message, code: err.code }))
        }
        if (req.patient?.contact_type === 'phone' && (patient?.phone || phone)) {
            sendBookingConfirmationSms({
                appointment: { ...appointment, patient_phone: patient?.phone || phone },
                doctor,
                clinic: req.tenant
            }).catch(err => log.error("Booking confirmation SMS FAILED", { appointmentId: appointment.id, clinicId, error: err.message }))
        }

        return res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: appointment
        })
    } catch (error) {
        log.error('Error booking appointment', { clinicId: req.tenant?.id, error: error.message })
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : 'Internal server error'
        })
    }
}

export const getAppointment = async (req, res) => {
    try {
        const { id } = req.params
        const clinicId = req.tenant?.id
        const token = req.headers?.['x-appointment-token']
        if (!clinicId || typeof token !== 'string' || !token) return res.status(403).json({success:false,message:'Use the appointment link from your confirmation.'})

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, name, email, phone),
                doctor:doctors(id, full_name, specialization)
            `)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .eq('cancel_token', token)
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
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : 'Internal server error'
        })
    }
}

export const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params
        const token = req.params.token || req.body?.cancel_token
        const clinicId = req.tenant?.id
        if (!clinicId || typeof token !== 'string' || !token) return res.status(403).json({success:false,message:'Invalid cancellation link.'})
        const {data:appointment,error} = await supabase.from('appointments')
            .select('*, patient:patients(id,name,email,phone), doctor:doctors(id,full_name,specialization)')
            .eq('id',id).eq('clinic_id',clinicId).eq('cancel_token',token).maybeSingle()
        if (error) return res.status(503).json({success:false,message:'Unable to load the appointment. Please try again.'})
        if (!appointment) return res.status(404).json({success:false,message:'Appointment not found or cancellation link is invalid.'})
        if (appointment.status === 'cancelled') return res.status(200).json({success:true,message:'Appointment already cancelled.'})
        if (appointment.status !== 'confirmed') return res.status(409).json({success:false,message:'Only confirmed appointments can be cancelled.'})
        const {data:updated,error:updateError} = await supabase.from('appointments').update({status:'cancelled'})
            .eq('id',id).eq('clinic_id',clinicId).eq('status','confirmed').select('id').maybeSingle()
        if (updateError) return res.status(503).json({success:false,message:'Unable to cancel the appointment. Please try again.'})
        if (!updated) return res.status(409).json({success:false,message:'This appointment changed. Please reload it.'})
        notifyAppointmentChange(appointment,'cancelled')
        logAppointmentEvent(id,clinicId,'cancelled',{date:appointment.appointment_date,time:appointment.appointment_time})
        if (appointment.patient?.email) sendCancellationEmail({appointment,patient:appointment.patient,doctor:appointment.doctor,clinic:req.tenant})
            .catch(err=>log.error('Cancellation email failed',{error:err.message}))
        return res.status(200).json({success:true,message:'Appointment cancelled successfully'})
    } catch(error) {
        log.error('Cancellation failed',{error:error.message})
        return res.status(500).json({success:false,message:'Unable to cancel the appointment.'})
    }
}
export const cancelAppointmentWithToken = cancelAppointment

export const rescheduleAppointment = async (req, res) => {
    try {
        const { id, token } = req.params
        const { appointment_date, appointment_time: requestedTime } = req.body

        if (!appointment_date || !requestedTime) {
            return res.status(400).json({
                success: false,
                message: 'New appointment date and time are required'
            })
        }

        const clinicId = req.tenant?.id
        if (!clinicId || !token) return res.status(403).json({success:false,message:'Invalid rescheduling link.'})

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id,name,email,phone),
                doctor:doctors(id,full_name,specialization)
            `)
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .eq('cancel_token', token)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (appointment.clinic_id !== clinicId || appointment.cancel_token !== token) {
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

        const appointment_time = await requireAvailableAppointment({db:supabase,clinicId,doctorId:appointment.doctor_id,date:appointment_date,time:requestedTime,timezone:req.tenant?.timezone,excludeId:id})

        // Store old time for email
        const oldTime = appointment.appointment_time

        // Update appointment
        let { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                appointment_date,
                appointment_time,
                reminder_sent: false
            })
            .eq('id', id).eq('clinic_id',clinicId).eq('status','confirmed').select('id').maybeSingle()

        // Older installations may not have the optional reminder column.
        // Retry only a missing-column error; other failures must stay failures.
        if (updateError && ['42703', 'PGRST204'].includes(updateError.code) && /reminder_sent/i.test(updateError.message || '')) {
            const result = await supabase.from('appointments')
                .update({ appointment_date, appointment_time }).eq('id', id).eq('clinic_id',clinicId).eq('status','confirmed').select('id').maybeSingle()
            updateError = result.error
            updated = result.data
        }

        if (updateError) {
            return res.status(updateError.code === '23505' ? 409 : 400).json({
                success: false,
                message: updateError.code === '23505' ? 'This slot is no longer available' : 'Failed to reschedule appointment'
            })
        }

        if (!updated) return res.status(409).json({success:false,message:'This appointment changed. Please reload it.'})

        notifyAppointmentChange({ ...appointment, appointment_date, appointment_time }, "rescheduled", {
            previousDate: appointment.appointment_date,
        })

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
        return res.status(error.status || 500).json({
            success: false,
            message: error.status ? error.message : 'Internal server error'
        })
    }
}
