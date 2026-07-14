import express from "express"
import { bookAppointment, cancelAppointment, getAppointment, cancelAppointmentWithToken, rescheduleAppointment } from "../controllers/Appointment.js"
import { getPatientHistory } from "../controllers/SessionNotes.js"
import { protect } from "../middleware/auth.js"
import { enforceSubscription, enforcePlanLimits } from "../middleware/tenant.js"

const AppointmentRouter = express.Router()

// Booking requires tenant (resolveTenant runs on this router), subscription, and patient auth
AppointmentRouter.post("/book", enforceSubscription, enforcePlanLimits("appointments"), protect, bookAppointment)

// Patient history requires patient auth
AppointmentRouter.get("/history", protect, getPatientHistory)

// Get appointment by ID — no auth required (token-based access)
AppointmentRouter.get("/:id", getAppointment)

// Cancel appointment — token-based
AppointmentRouter.patch("/:id/cancel", cancelAppointment)
AppointmentRouter.patch("/:id/cancel/:token", cancelAppointmentWithToken)

// Reschedule appointment — token-based
AppointmentRouter.patch("/:id/reschedule/:token", rescheduleAppointment)

export default AppointmentRouter
