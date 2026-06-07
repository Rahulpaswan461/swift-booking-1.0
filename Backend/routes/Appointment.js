import express from "express"
import { bookAppointment, cancelAppointment, getAppointment, cancelAppointmentWithToken, rescheduleAppointment } from "../controllers/Appointment.js"

const AppointmentRouter = express.Router()

AppointmentRouter.post("/book", bookAppointment)
AppointmentRouter.get("/:id",getAppointment)
AppointmentRouter.patch("/:id/cancel", cancelAppointment)
AppointmentRouter.patch("/:id/cancel/:token", cancelAppointmentWithToken)
AppointmentRouter.patch("/:id/reschedule/:token", rescheduleAppointment)

export default AppointmentRouter