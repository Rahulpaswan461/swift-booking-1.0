import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/patient.js";
import { sendBookingConfirmationEmail } from "../services/emailService.js";

export const bookAppointment = async (req, res) => {
    try {
        const { fullName, email, phone, date_of_birth, appointment_date, appointment_time, doctor_id, notes } = req.body;

        if (!fullName  || !phone || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ success: false, messsage: "Please fill all the fields" })
        }

        const doctor = await Doctor.findOne({ _id: doctor_id, is_active: true })

        if (!doctor) {
            return res.status(400).json({ success: false, messsage: "Doctor not found or unavailable" })
        }

        //update the patient email
        //in case they are booking with the same email

        const patient = await Patient.findOneAndUpdate(
            { email },                                        // 1. filter — find by this
            { $set: { fullName, phone, date_of_birth } },    // 2. update — set these fields
            { upsert: true, new: true, runValidators: true }  // 3. options
        )
        console.log("patient: ", patient)

        //Creating the appointment

        const appointment = await Appointment.create({
            patient_id: patient._id,
            doctor_id: doctor._id,
            appointment_date: appointment_date,
            appointment_time: appointment_time,
            status: 'confirmed',
            note: notes || ''
        })

        if (!appointment) {
            return res.status(404).json({ success: false, messsage: "Appointment not created" })
        }

        //send the confirmation email to the user

        const result = await sendBookingConfirmationEmail({ appointment, patient, doctor })
        console.info("email status: ", result)

        if (!result) {
            return res.status(400).json({ success: false, messsage: "Email not sent" })
        }

        return res.status(200).json({
            success: true,
            message: "Appointment created successfully",
            data: {
                appointment_id: appointment._id,
                patient_name: patient.fullName,
                doctor,
                specialization: doctor.specialization,
                appointment_date,
                appointment_time

            }
        })

    }
    catch (error) {
        console.error("Booking appointment error", error)
        return res.status(500).json({ success: false, messsage: "Something went wrong" })
    }
}

export const getAppointment = async (req, res) => {
    try {
        const { id: appointment_id } = req.params;
        if (!appointment_id) {
            return res.status(400).json({ success: false, message: "Please provide appointment id" })
        }
        const appointment = await Appointment.findOne({ _id: appointment_id })
        if (!appointment) {
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
    try{
        const { id: appointment_id } = req.params;
        if (!appointment_id) {
            return res.status(400).json({ success: false, message: "Please provide appointment id" })
        }
        const appointment = await Appointment.findOneAndUpdate({ _id: appointment_id }, { status: "cancelled" })
        if (!appointment) {
            return res.status(400).json({ success: false, message: "Appointment not found" })
        }
        return res.status(200).json({ message: "Appointment cancelled successfully" })
    }
    catch(error){
        console.error("Error while canceling appointment", error)
        return res.status(500).json({message: "Internal Server Error"})
    }
}