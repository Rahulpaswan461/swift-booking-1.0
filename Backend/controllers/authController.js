import jwt from "jsonwebtoken"
import Otp from "../models/Otp.js"
import { generateOtp, getOtpExpiry } from "../utils/otpUtils.js"
import { sendOtpEmail } from "../services/emailService.js";

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email.' })
        }

        await Otp.deleteMany({ email })

        const otp = generateOtp();
        const expiresAt = getOtpExpiry();

        const otpDoc = await Otp.create({
            email,
            otp,
            expires_at: expiresAt
        })

        if (!otpDoc) {
            return res.status(400).json({ success: false, message: 'Failed to create OTP.' })
        }
        console.log("otp send successfully")

        await sendOtpEmail({ email, otp })

        return res.status(200).json({ success: true, message: 'OTP sent successfully.' })
    }
    catch (error) {
        console.error("Error while sending otp", error)
        return res.status(500).json({ success: false, message: 'Failed to send OTP.' })
    }
}

export const verifyOtp = async (req, res) =>{
    try{
        const { email, otp } = req.body;

        if(!email || !otp){
            return res.status(400).json({ success: false, message: 'Please provide email and otp.' })
        }

        const record = await Otp.findOne({ email, used:false })
        
        // Case 1 - no OTP found for this email
        if(!record){
            return res.status(400).json({ success: false, message: 'Invalid OTP.' })
        }

        // Case 2 - OTP expired 
        if(record.expires_at < new Date()){
            await Otp.deleteOne({_id: record._id});
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' })
        }

        //Case 3 - Wrong OTP
        if(record.otp !== otp){
            return res.status(400).json({ success: false, message: 'Invalid OTP.' })
        }

        record.used = true;
        await record.save();

        const token = jwt.sign(
            {email},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN}
        )


        return res.status(200).json({
            success: true,
            messsage: 'OTP verified successfully',
            token
        })

    }
    catch(error){
        console.error("verifyOtp error", error)
        return res.status(500).json({ success: false, message: 'Failed to verify OTP.' })
    }
}