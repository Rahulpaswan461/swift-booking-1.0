import express from "express"
import { bookAppointment, cancelAppointment, getAppointment } from "../controllers/Appointment.js"

const AppointmentRouter = express.Router()

AppointmentRouter.post("/book", bookAppointment)
AppointmentRouter.get("/:id",getAppointment)
AppointmentRouter.patch("/:id/cancel", cancelAppointment)

export default AppointmentRouter