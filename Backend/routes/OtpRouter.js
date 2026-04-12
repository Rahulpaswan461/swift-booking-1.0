import express from "express"
import { sendOtp, verifyOtp } from "../controllers/authController.js"

const OtpRouter = express.Router()

OtpRouter.post("/send-otp", sendOtp)
OtpRouter.post("/verify-otp", verifyOtp)

export default OtpRouter