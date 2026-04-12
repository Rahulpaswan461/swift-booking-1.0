import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema({
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true
    },
    appointment_date:{
        type: String,
        required: true
    },
    appointment_time:{
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'],
        default: "confirmed"
    },
    notes:{
        type: String,
        default:""
    }
},{timestamps: {createdAt: "created_at", updatedAt: "updated_at"}});

const Appointment = mongoose.model("Appointment", appointmentSchema)

export default Appointment