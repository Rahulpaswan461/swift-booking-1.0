import mongoose from "mongoose"

const doctorUnavailabilitySchema = new mongoose.Schema({
    doctorId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true,
        unique: true
    },
    date: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        default: null
    },
    endTime: {
        type: String,
        default: null
    },
    reason:{
        type: String,
        required: true
    }    
},{timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}})

const DoctorUnavailability = mongoose.model('DoctorUnavailability', doctorUnavailabilitySchema)

export default DoctorUnavailability