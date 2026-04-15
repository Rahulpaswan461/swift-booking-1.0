import express from "express"
import { bookAppointment, cancelAppointment, getAppointment, cancelAppointmentWithToken } from "../controllers/Appointment.js"

const AppointmentRouter = express.Router()

AppointmentRouter.post("/book", bookAppointment)
AppointmentRouter.get("/:id",getAppointment)
AppointmentRouter.patch("/:id/cancel", cancelAppointment)
AppointmentRouter.patch("/:id/cancel/:token", cancelAppointmentWithToken)

export default AppointmentRouter