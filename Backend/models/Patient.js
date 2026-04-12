import mongoose from "mongoose"

const patientSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    phone:{
        type: String,
        required: true,
    },
    date_of_birth:{
        type: String
    }
},{timestamps: {createdAt: "created_at"}});

const Patient = mongoose.model("Patient", patientSchema)

export default Patient