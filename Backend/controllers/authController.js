import jwt from "jsonwebtoken"
import supabase from "../config/supabase.js"
import { generateOtp, getOtpExpiry } from "../utils/otpUtils.js"
import { sendOtpEmail } from "../services/emailService.js"

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email.' })
        }

        // Delete all existing OTPs for this email
        await supabase.from('otps').delete().eq('email', email)

        const otp = generateOtp();
        const expiresAt = getOtpExpiry();

        const { data: otpDoc, error } = await supabase
            .from('otps')
            .insert({
                email,
                otp,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single()

        if (error || !otpDoc) {
            console.error("Error creating OTP:", error)
            return res.status(400).json({ success: false, message: 'Failed to create OTP.' })
        }
        console.log("otp sent successfully")

        await sendOtpEmail({ email, otp })

        return res.status(200).json({ success: true, message: 'OTP sent successfully.' })
    }
    catch (error) {
        console.error("Error while sending otp", error)
        return res.status(500).json({ success: false, message: 'Failed to send OTP.' })
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Please provide email and otp.' })
        }

        // Find unused OTP for this email
        const { data: record, error: fetchError } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .single()

        if (fetchError || !record) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' })
        }

        // Case 1 - OTP expired
        if (new Date(record.expires_at) < new Date()) {
            await supabase.from('otps').delete().eq('id', record.id)
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' })
        }

        // Case 2 - Wrong OTP
        if (record.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' })
        }

        // Case 3 - Mark OTP as used
        const { error: updateError } = await supabase
            .from('otps')
            .update({ used: true })
            .eq('id', record.id)

        if (updateError) throw updateError

        const token = jwt.sign(
            { email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        )

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token
        })

    }
    catch (error) {
        console.error("verifyOtp error", error)
        return res.status(500).json({ success: false, message: 'Failed to verify OTP.' })
    }
}