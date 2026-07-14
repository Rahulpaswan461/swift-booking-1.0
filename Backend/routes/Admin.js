import express from "express"
import { addUnavailability, setDoctorSchedule } from "../controllers/scheduleController.js"
import { adminlogin, getAllAppointments, getStats, toggleDoctor } from "../controllers/adminController.js"
import { registerClinic, resolveClinic, updateBranding, getMyClinic, updateClinicSettings } from "../controllers/clinicController.js"
import { createDoctorForClinic, listDoctorsForClinic, updateDoctorForClinic } from "../controllers/doctorManagement.js"
import { protectAdmin } from "../middleware/auth.js"
import { reminderHandler } from "../services/reminder.js"
import { enforceSubscription, enforcePlanLimits } from "../middleware/tenant.js"

const adminRouter = express.Router()

// --- Public: Clinic self-registration (no tenant, no auth) ---
adminRouter.post("/clinics", registerClinic)

// --- Public: Clinic resolve (resolves from Host header in the controller) ---
adminRouter.get("/clinic/resolve", resolveClinic)

// --- Public: Admin login ---
adminRouter.post("/login", adminlogin)

// --- Authenticated: logged-in admin's own clinic (clinic_id from JWT) ---
adminRouter.get("/clinic/me", protectAdmin, getMyClinic)

// --- Authenticated admin routes (clinic_id from JWT) ---
// Subscription + plan enforcement runs AFTER protectAdmin

// Doctor management
adminRouter.post("/doctors", protectAdmin, enforceSubscription, enforcePlanLimits("doctors"), createDoctorForClinic)
adminRouter.get("/doctors", protectAdmin, enforceSubscription, listDoctorsForClinic)
adminRouter.patch("/doctors/:id", protectAdmin, enforceSubscription, updateDoctorForClinic)

// Admin sets doctor's weekly schedule
adminRouter.post("/doctors/:id/schedule", protectAdmin, enforceSubscription, setDoctorSchedule)

// Admin marks unavailability
adminRouter.post("/doctors/:id/unavailability", protectAdmin, enforceSubscription, addUnavailability)

adminRouter.patch("/doctors/:id/toggle", protectAdmin, enforceSubscription, toggleDoctor)

// Appointments
adminRouter.get("/appointments", protectAdmin, enforceSubscription, getAllAppointments)

// Stats
adminRouter.get("/stats", protectAdmin, enforceSubscription, getStats)

// Update clinic branding
adminRouter.patch("/clinic/branding", protectAdmin, enforceSubscription, updateBranding)

// Update clinic settings (operating hours)
adminRouter.patch("/clinic/settings", protectAdmin, enforceSubscription, updateClinicSettings)

// Manually trigger tomorrow's reminders (for testing / external schedulers)
adminRouter.post("/reminders/run", protectAdmin, reminderHandler)

export default adminRouter
