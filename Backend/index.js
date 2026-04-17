import express from "express"
import "./env.js"
import connectMongoDb from "./connection.js"
import AppointmentRouter from "./routes/Appointment.js"
import DoctorRouter from "./routes/Doctor.js"
import OtpRouter from "./routes/OtpRouter.js"
import AdminRouter from "./routes/Admin.js"
import { protectDoctor } from "./middleware/auth.js"
import cors from "cors"


const app = express()

//creating the connection
connectMongoDb(process.env.MONGO_URL)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((error) => console.log("Error while connecting mongoDb", error))

const PORT = process.env.PORT || 3000;

app.use(express.json())
// app.use(protectDoctor)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://swift-booking-1-0.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.get("/health", (req, res) => {
    return res.send("ok")
})

app.get("/", (req, res) => {
    return res.send("From the server")
})

app.use("/api/appointments", AppointmentRouter)
app.use("/api/doctors", DoctorRouter)
app.use("/api/auth", OtpRouter)
app.use("/api/admin", AdminRouter)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})