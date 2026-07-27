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
import { dodoWebhook } from "./controllers/billingController.js"
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js"
import { verifyEmailTransport } from "./services/emailService.js"
import { dodoConfigured } from "./services/dodoPayments.js"
import { EARLY_ACCESS } from "./config/plans.js"
import createLogger from "./utils/logger.js"
import cors from "cors"

const log = createLogger("startup")

const app = express()

const PORT = process.env.PORT || 3000

// Keep the raw body around — payment webhooks are signed over the exact
// bytes received, so verification needs them untouched.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))

// Allow the platform domain and every clinic subdomain, in dev and prod.
// e.g. http://localhost:5173, http://apollo.localhost:5173,
//      https://healibrate.in, https://apollo.healibrate.in
const APP_BASE_DOMAIN = (process.env.APP_BASE_DOMAIN || "healibrate.in").split(":")[0]
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

// --- Payment webhooks (signature-verified, no auth) ---
app.post("/api/webhooks/dodo", dodoWebhook)

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
    log.info(`Server listening on port ${PORT}`)

    // One-glance env sanity — makes a misconfigured deploy obvious at boot
    // instead of surfacing as a mysterious runtime failure later.
    log.info("Environment", {
        nodeEnv: process.env.NODE_ENV || "development",
        baseDomain: process.env.APP_BASE_DOMAIN || "(default healibrate.in)",
        supabase: process.env.SUPABASE_URL ? "configured" : "MISSING",
        payments: dodoConfigured() ? "configured" : "not configured",
        billingEnforced: EARLY_ACCESS ? "no (early access / beta)" : "yes",
        email: process.env.SMTP_HOST ? `smtp:${process.env.SMTP_HOST}` : (process.env.EMAIL_USER ? "gmail" : "MISSING"),
    })

    // Actively test the SMTP connection so a bad credential is caught NOW,
    // loudly — this is exactly the "email silently not working" case.
    verifyEmailTransport()

    // Daily appointment reminders (day-before, 08:00 local by default)
    startReminderJob()
    // Weekly founder digest (Mondays, 09:00 local by default)
    startFounderDigestJob()
})
