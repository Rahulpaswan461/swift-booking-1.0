import Doctor from "../models/Doctor.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import DoctorUnavailability from "../models/DoctorUnavailability.js";
import { generateSlots, getDayAbb, isSlotBlocked } from "../utils/slotUtils.js";
import Appointment from '../models/Appointment.js'

//Admin sets or updates a doctor's default weekly schedule
export const setDoctorSchedule = async (req, res) => {
    try {
        const { id: doctor_id } = req.params;
        const { workingDays, startTime, endTime, slotDurationMin } = req.body;

        if (!workingDays || !startTime || !endTime || !slotDurationMin) {
            return res.status(400).json({ message: "Please provide all the fields" })
        }

        const doctor = await Doctor.findById(doctor_id)
        if (!doctor) {
            return res.status(400).json({ message: "Doctor not found" })
        }
        //insert data if exists otherwise create a new one
        const schedule = await DoctorSchedule.findOneAndUpdate(
            { doctorId: doctor_id },
            { workingDays: workingDays, startTime, endTime, slotDurationMin },
            { upsert: true, new: true, runValidators: true }
        )


        return res.status(200).json({ success: false, data: schedule })

    }
    catch (error) {
        console.error("Error while setting doctor schedule", error)
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

//mark the doctor as unavailable
export const addUnavailability = async (req, res) => {
    try {
        const { id: doctorId } = req.params;
        const { date, startTime, endTime, reason } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required: " })
        }

        const doctor = await Doctor.findById(doctorId)
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found. ' })
        }

        const unavailability = await DoctorUnavailability.findOneAndUpdate(
            { doctorId },
            { startTime, endTime, reason },
            { upsert: true, new: true, runValidators: true }
        )


        return res.status(201).json({ success: true, data: unavailability })

    }
    catch (error) {
        console.log("addUnavailabity error: ", error);
        return res.status(500).json({ success: false, message: "Internal Server Error !!" })
    }
}
//Return available slots for a doctor on a given date
export const getDoctorSlots = async (req, res) => {
    try {
        const { id: doctorId } = req.params;
        const { date } = req.query

        if (!date) {
            return res.status(400).json({ success: false, message: "date query params is required " })
        }

        //1 Get doctor's default schedule

        const schedule = await DoctorSchedule.findOne({ doctorId })
        if (!schedule) {
            return res.status(400).json({ success: false, message: 'No schedule set for this doctor.' })
        }

        console.log("schedule of the doctor: ", schedule)
        //2 Check if requested date is working day 
        const dayAbbr = getDayAbb(date)
        console.log("Day abbpre: ", dayAbbr)
        if (!schedule.workingDays.includes(dayAbbr)) {
            return res.status(200).json({ success: true, availableSlots: [], message: "Doctor is of on this day. " })

        }

        const allSlots = generateSlots(schedule.startTime, schedule.endTime, schedule.slotDurationMin);

        //4. Get unavailabilities for this date
        const unavailabilities = await DoctorUnavailability.findOne({ doctorId, date })


        // 5 Get already booked slots for this date
        const bookedAppointments = await Appointment.find({
            doctor_id: doctorId,
            appointment_date: date,
            status: { $in: ['confirmed', 'pending'] }
        }).select('appointment_time');

        console.log("booked appointment: ",bookedAppointments)

        const bookedTimes = bookedAppointments.map(a => a.appointment_time)


        // 6. Filter out blocked and booked slots
        console.log("all slots: ", allSlots)
        console.log("bookedTime: ", bookedTimes)
        const availableSlots = allSlots.filter(slot => {
            const isBooked = bookedTimes.includes(slot);
            const isBlocked = isSlotBlocked(slot, unavailabilities)

            return !isBooked && !isBlocked;
        })
        console.log("avialable slots: ", availableSlots)

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
