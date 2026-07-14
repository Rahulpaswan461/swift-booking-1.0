import "dotenv/config"
import express from "express"
import AppointmentRouter from "./routes/Appointment.js"
import { PatientDoctorRouter, DoctorAuthRouter } from "./routes/Doctor.js"
import OtpRouter from "./routes/OtpRouter.js"
import AdminRouter from "./routes/Admin.js"
import { resolveClinic } from "./controllers/clinicController.js"
import { resolveTenant, enforceSubscription, enforcePlanLimits } from "./middleware/tenant.js"
import { auditMiddleware } from "./utils/auditLogger.js"
import { startReminderJob } from "./services/reminder.js"
import { startFounderDigestJob } from "./services/founderDigest.js"
import { submitSupportRequest } from "./controllers/supportController.js"
import { getPlatformMetrics } from "./controllers/platformController.js"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js"
import cors from "cors"

const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())

// Allow the platform domain and every clinic subdomain, in dev and prod.
// e.g. http://localhost:5173, http://apollo.localhost:5173,
//      https://medibook.in, https://apollo.medibook.in
const APP_BASE_DOMAIN = (process.env.APP_BASE_DOMAIN || "medibook.in").split(":")[0]
const CORS_EXTRA = ["https://swift-booking-1-0.vercel.app"]
app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true) // curl, server-to-server
        try {
            const { hostname } = new URL(origin)
            const allowed =
                hostname === "localhost" || hostname.endsWith(".localhost") ||
                hostname === APP_BASE_DOMAIN || hostname.endsWith(`.${APP_BASE_DOMAIN}`) ||
                CORS_EXTRA.includes(origin)
            return cb(null, allowed)
        } catch {
            return cb(null, false)
        }
    },
    credentials: true
}))

// --- Audit logging (captures all mutating requests) ---
app.use(auditMiddleware())

app.get("/health", (req, res) => {
    return res.send("ok")
})

// --- Platform-level routes (no tenant): support + founder metrics ---
app.post("/api/support", submitSupportRequest)
app.get("/api/platform/metrics", getPlatformMetrics)

// --- Tier 1: Admin routes (no tenant needed — clinic_id derived from JWT) ---
// Subscription/plan enforcement is per-route, AFTER protectAdmin (see Admin.js)
app.use("/api/admin", AdminRouter)

// --- Tier 2: Doctor routes (no tenant needed — clinic_id derived from JWT) ---
// Subscription enforcement for authenticated doctor routes is per-route (see Doctor.js)
app.use("/api/doctor", DoctorAuthRouter)

// --- Tier 3: Patient-facing routes (tenant-resolved from Host header) ---
// These only match what wasn't consumed by /api/admin or /api/doctor above
const tenantRouter = express.Router()
tenantRouter.use(resolveTenant)
tenantRouter.get("/clinic/info", resolveClinic)          // Clinic info with branding
tenantRouter.use("/auth", OtpRouter)               // POST /api/auth/request, /api/auth/send-otp, etc.
tenantRouter.use("/doctors", PatientDoctorRouter)  // GET /api/doctors, GET /api/doctors/:id/slots
tenantRouter.use("/appointments", AppointmentRouter) // POST /api/appointments/book, etc.

app.use("/api", tenantRouter)

// --- Error handling (must be last) ---
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    // Daily appointment reminders (day-before, 08:00 local by default)
    startReminderJob()
    // Weekly founder digest (Mondays, 09:00 local by default)
    startFounderDigestJob()
})
