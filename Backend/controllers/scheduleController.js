import supabase from "../config/supabase.js"
import { availableAppointments, clockTime, validDate } from "../services/appointmentAvailability.js"

// Admin sets or updates a doctor's default weekly schedule
export const setDoctorSchedule = async (req, res) => {
    try {
        const clinicId = req.admin?.clinic_id
        const { id: doctor_id } = req.params;
        const { workingDays, startTime, endTime, slotDurationMin } = req.body;

        if (!Array.isArray(workingDays) || !workingDays.length || workingDays.some(day => !['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(day)) || !clockTime(startTime) || !clockTime(endTime) || clockTime(startTime) >= clockTime(endTime) || !Number.isInteger(Number(slotDurationMin)) || Number(slotDurationMin) < 1 || Number(slotDurationMin) > 1440) {
            return res.status(400).json({ message: "Choose valid working days, start/end times and a positive whole-number slot duration." })
        }

        // Check if doctor exists and belongs to this admin's clinic
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctor_id)
            .single()

        if (doctorError || !doctor) {
            return res.status(400).json({ message: "Doctor not found" })
        }

        if (clinicId && doctor.clinic_id !== clinicId) {
            return res.status(403).json({ message: "Doctor does not belong to your clinic" })
        }

        // Upsert schedule (insert if new, update if exists)
        const { data: schedule, error } = await supabase
            .from('doctor_schedules')
            .upsert(
                {
                    doctor_id,
                    working_days: workingDays,
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration_min: Number(slotDurationMin),
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'doctor_id' }
            )
            .select()
            .single()

        if (error) throw error

        return res.status(200).json({ success: true, data: schedule })

    }
    catch (error) {
        console.error("Error while setting doctor schedule", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

// Mark the doctor as unavailable
export const addUnavailability = async (req, res) => {
    try {
        const clinicId = req.admin?.clinic_id
        const { id: doctorId } = req.params;
        const { date, startTime, endTime, reason } = req.body;

        if (!validDate(date) || ((startTime || endTime) && (!clockTime(startTime) || !clockTime(endTime) || clockTime(startTime) >= clockTime(endTime)))) {
            return res.status(400).json({ success: false, message: "Choose a valid date and time range." })
        }

        // Check if doctor exists and belongs to this admin's clinic
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctorId)
            .single()

        if (doctorError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' })
        }

        if (clinicId && doctor.clinic_id !== clinicId) {
            return res.status(403).json({ success: false, message: 'Doctor does not belong to your clinic.' })
        }

        const { data: unavailability, error } = await supabase
            .from('doctor_unavailability')
            .insert({
                doctor_id: doctorId,
                date,
                start_time: startTime || null,
                end_time: endTime || null,
                reason: reason || ''
            })
            .select()
            .single()

        if (error) throw error

        return res.status(201).json({ success: true, data: unavailability })

    }
    catch (error) {
        console.log("addUnavailability error: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error !!" })
    }
}

// Use the same availability rules for display, booking and rescheduling.
export const getDoctorSlots = async (req, res) => {
  try {
    const availableSlots = await availableAppointments({db:supabase,clinicId:req.tenant?.id,doctorId:req.params.id,date:req.query.date,timezone:req.tenant?.timezone})
    return res.status(200).json({success:true,date:req.query.date,doctorId:req.params.id,availableSlots})
  } catch(error) {
    return res.status(error.status || 500).json({success:false,message:error.status ? error.message : 'Unable to load appointment times.'})
  }
}
