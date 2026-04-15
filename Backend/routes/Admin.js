import express from "express"
import { addUnavailability, setDoctorSchedule } from "../controllers/scheduleController.js"
import { adminlogin, getAllAppointments, getStats, toggleDoctor } from "../controllers/adminController.js"
import { protectAdmin } from "../middleware/auth.js"


const adminRouter = express.Router()

//Admin login
adminRouter.post("/login", adminlogin)

//ADmin sets doctor's weely schedule
adminRouter.post('/doctors/:id/schedule', protectAdmin, setDoctorSchedule)

// Admin or Doctor mark unavailability
adminRouter.post("/doctors/:id/unavailability", protectAdmin, addUnavailability)

adminRouter.get("/appointments", protectAdmin, getAllAppointments)

adminRouter.get("/stats", protectAdmin, getStats)

adminRouter.patch("/doctors/:id/toggle", toggleDoctor)



export default adminRouter