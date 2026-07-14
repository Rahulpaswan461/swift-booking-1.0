import express from "express"
import { requestOtp, verifyOtp } from "../controllers/authController.js"

const OtpRouter = express.Router()

// --- New multi-tenant endpoints (preferred) ---
OtpRouter.post("/request", requestOtp)
OtpRouter.post("/verify", verifyOtp)

// --- Backward-compatible wrappers (for old clients) ---
// Translates { email } → { contact_value, contact_type } but never
// clobbers fields the client already sent (phone requests broke otherwise).
OtpRouter.post("/send-otp", async (req, res) => {
  req.body.contact_value = req.body.contact_value || req.body.email
  req.body.contact_type = req.body.contact_type || "email"
  return requestOtp(req, res)
})

OtpRouter.post("/verify-otp", async (req, res) => {
  req.body.contact_value = req.body.contact_value || req.body.email
  req.body.contact_type = req.body.contact_type || "email"
  req.body.otp_code = req.body.otp_code || req.body.otp
  return verifyOtp(req, res)
})

export default OtpRouter
