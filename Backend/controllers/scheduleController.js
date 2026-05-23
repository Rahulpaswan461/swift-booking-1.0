import supabase from "../config/supabase.js"
import { generateSlots, getDayAbb, isSlotBlocked } from "../utils/slotUtils.js"

// Admin sets or updates a doctor's default weekly schedule
export const setDoctorSchedule = async (req, res) => {
    try {
        const { id: doctor_id } = req.params;
        console.log("req: ", req.params)
        console.log("doctorid: ", doctor_id)
        const { workingDays, startTime, endTime, slotDurationMin } = req.body;

        if (!workingDays || !startTime || !endTime || !slotDurationMin) {
            return res.status(400).json({ message: "Please provide all the fields" })
        }

        // Check if doctor exists
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', doctor_id)
            .single()

        if (doctorError || !doctor) {
            return res.status(400).json({ message: "Doctor not found" })
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
        const { id: doctorId } = req.params;
        const { date, startTime, endTime, reason } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required" })
        }

        // Check if doctor exists
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', doctorId)
            .single()

        if (doctorError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' })
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

        if (!date) {
            return res.status(400).json({ success: false, message: "date query params is required" })
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

        console.log("schedule of the doctor: ", schedule)

        // 2. Check if requested date is working day
        const dayAbbr = getDayAbb(date)
        console.log("Day abbr: ", dayAbbr)
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

        console.log("booked appointment: ", bookedAppointments)

        const bookedTimes = bookedAppointments?.map(a => a.appointment_time) || []

        // 6. Filter out blocked and booked slots
        console.log("all slots: ", allSlots)
        console.log("bookedTimes: ", bookedTimes)
        const availableSlots = allSlots.filter(slot => {
            const isBooked = bookedTimes.includes(slot);
            const isBlocked = isSlotBlocked(slot, unavailabilities?.[0])

            return !isBooked && !isBlocked;
        })
        console.log("available slots: ", availableSlots)

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
