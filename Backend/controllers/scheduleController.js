import supabase from "../config/supabase.js"
import { generateSlots, getDayAbb, isSlotBlocked } from "../utils/slotUtils.js"

// Admin sets or updates a doctor's default weekly schedule
export const setDoctorSchedule = async (req, res) => {
    try {
        const clinicId = req.admin?.clinic_id
        const { id: doctor_id } = req.params;
        const { workingDays, startTime, endTime, slotDurationMin } = req.body;

        if (!workingDays || !startTime || !endTime || !slotDurationMin) {
            return res.status(400).json({ message: "Please provide all the fields" })
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
                    slot_duration_min: slotDurationMin,
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

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required" })
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

// Return available slots for a doctor on a given date
export const getDoctorSlots = async (req, res) => {
    try {
        const { id: doctorId } = req.params;
        const { date } = req.query
        const clinicId = req.tenant?.id

        if (!date) {
            return res.status(400).json({ success: false, message: "date query params is required" })
        }

        if (!clinicId) {
            return res.status(400).json({ success: false, message: "Clinic context is required. Access through your clinic subdomain." })
        }

        // 0. Doctor must belong to the resolved clinic (tenant isolation)
        const { data: slotDoctor } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctorId)
            .single()

        if (!slotDoctor || slotDoctor.clinic_id !== clinicId) {
            return res.status(404).json({ success: false, message: 'Doctor not found at this clinic.' })
        }

        // 1. Get doctor's default schedule
        const { data: schedule, error: scheduleError } = await supabase
            .from('doctor_schedules')
            .select('*')
            .eq('doctor_id', doctorId)
            .single()

        if (scheduleError || !schedule) {
            return res.status(400).json({ success: false, message: 'No schedule set for this doctor.' })
        }

        // 2. Check if requested date is working day
        const dayAbbr = getDayAbb(date)
        if (!schedule.working_days.includes(dayAbbr)) {
            return res.status(200).json({ success: true, availableSlots: [], message: "Doctor is off on this day." })
        }

        const allSlots = generateSlots(schedule.start_time, schedule.end_time, schedule.slot_duration_min);

        // 4. Get unavailabilities for this date
        const { data: unavailabilities } = await supabase
            .from('doctor_unavailability')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('date', date)

        // 5. Get already booked slots for this date
        const { data: bookedAppointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('appointment_time')
            .eq('doctor_id', doctorId)
            .eq('appointment_date', date)
            .in('status', ['confirmed', 'pending'])

        if (appointmentsError) throw appointmentsError

        const bookedTimes = bookedAppointments?.map(a => a.appointment_time) || []

        // 6. Filter out blocked and booked slots
        const availableSlots = allSlots.filter(slot => {
            const isBooked = bookedTimes.includes(slot);
            const isBlocked = isSlotBlocked(slot, date, schedule.slot_duration_min, unavailabilities)

            return !isBooked && !isBlocked;
        })

        return res.status(200).json({
            success: true,
            date,
            doctorId,
            availableSlots: availableSlots
        })

    }
    catch (err) {
        console.error('getDoctorSlots error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
}
