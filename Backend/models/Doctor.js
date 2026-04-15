import mongoose from "mongoose"

const doctorSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    qualification: {
        type: String,
    },
    specialization: {
        type: String,
    },
    is_active: {
        type: Boolean,
        default: true
    },
    first_login: {
        type: Boolean,
        default: true
    }

}, { timestamps: { createdAt: "created_at" } });

const Doctor = mongoose.model("Doctor", doctorSchema)

export default Doctor