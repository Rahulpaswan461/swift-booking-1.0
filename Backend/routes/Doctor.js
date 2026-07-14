import express from "express"
import { changePassword, doctorLogin, getAllDoctors, getDoctorAppointments, getDoctorPatients, updateAppointmentStatus } from "../controllers/Doctor.js"
import { getDoctorSlots } from "../controllers/scheduleController.js"
import { createSessionNotes, getSessionNotes, getPatientHistoryWithNotes } from "../controllers/SessionNotes.js"
import { protectDoctor } from "../middleware/auth.js"
import { enforceSubscription } from "../middleware/tenant.js"

// --- Tenant-resolved router (patient-facing, subdomain-scoped) ---
const PatientDoctorRouter = express.Router()

// List doctors for this clinic (tenant-resolved)
PatientDoctorRouter.get("/", getAllDoctors)

// Available slots for a doctor (tenant-resolved)
PatientDoctorRouter.get("/:id/slots", getDoctorSlots)

// --- Auth router (doctor login, password, appointments — no tenant needed) ---
const DoctorAuthRouter = express.Router()

// Doctor login (public)
DoctorAuthRouter.post("/login", doctorLogin)

// NOTE: the old public GET /:email doctor lookup was removed — it leaked
// doctor data across clinics and shadowed GET /appointments below.

// Change password (requires doctor auth + subscription)
DoctorAuthRouter.patch("/change-password", protectDoctor, enforceSubscription, changePassword)

// Doctor's own appointments (requires doctor auth + subscription)
DoctorAuthRouter.get("/appointments", protectDoctor, enforceSubscription, getDoctorAppointments)

// Doctor's patient roster with session counts and last notes
DoctorAuthRouter.get("/patients", protectDoctor, enforceSubscription, getDoctorPatients)

// Doctor updates appointment status (requires doctor auth + subscription)
DoctorAuthRouter.patch("/appointments/:id/status", protectDoctor, enforceSubscription, updateAppointmentStatus)

// Session notes: create/update notes for an appointment
DoctorAuthRouter.post("/appointments/:appointment_id/notes", protectDoctor, enforceSubscription, createSessionNotes)

// Session notes: get notes for an appointment
DoctorAuthRouter.get("/appointments/:appointment_id/notes", protectDoctor, enforceSubscription, getSessionNotes)

// Patient history with session notes (doctor view)
DoctorAuthRouter.get("/patient/:patient_id/history", protectDoctor, enforceSubscription, getPatientHistoryWithNotes)

export { PatientDoctorRouter, DoctorAuthRouter }
