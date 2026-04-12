import mongoose from "mongoose"

const doctorScheduleSchema = new mongoose.Schema({
    doctorId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true,
        unique: true
    },
    workingDays: {
        type: [String],
        enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    slotDurationMin:{
        type: Number,
        default: 15
    }
},{timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}})

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema)

export default DoctorSchedule