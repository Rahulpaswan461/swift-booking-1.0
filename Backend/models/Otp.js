import mongoose from "mongoose"

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used: { type: Boolean, default: false },
})

otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model("Otp", otpSchema)

export default Otp