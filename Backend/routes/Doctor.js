import express from "express"
import { changePassword, createDoctor, doctorLogin, getAllDoctors, getDoctor, getDoctorAppointments,updateAppointmentStatus } from "../controllers/Doctor.js"
import { getDoctorSlots } from "../controllers/scheduleController.js";
import { protectAdmin, protectDoctor } from "../middleware/auth.js";

const DoctorRouter = express.Router()

// DoctorRouter.post("/register", registerDoctor)

DoctorRouter.get("/appointments", protectDoctor,getDoctorAppointments)
DoctorRouter.patch("/appointments/:id/status", protectDoctor, updateAppointmentStatus)

DoctorRouter.get("/:email", getDoctor);

DoctorRouter.get("/",getAllDoctors)

DoctorRouter.get("/:id/slots", getDoctorSlots)

DoctorRouter.post("/create", createDoctor)

DoctorRouter.post("/login", doctorLogin)

DoctorRouter.patch("/change-password",changePassword)


export default DoctorRouter