MediBook — Clinic Appointment Booking System
A full-stack SaaS appointment booking system built for clinics. Patients book appointments via OTP verification, doctors manage their daily schedule, and admins oversee the entire operation from a central dashboard.
Live Demo: your-frontend.vercel.app
Backend API: swift-booking-1-0-1.onrender.com

Features
Patient

Email OTP verification — no password required
Browse doctors by specialization
View real-time available slots per doctor
Book appointments with confirmation email
Cancel appointments via secure link in email
24-hour reminder email before appointment

Doctor

Secure login with forced password change on first login
Daily appointment dashboard with date navigation
Mark appointments as completed or no-show
Summary stats — total, pending, completed, no-show per day

Admin

Overview dashboard with today, this week, and all-time stats
Per-doctor appointment breakdown
Full appointments table with filters by date, doctor, status
Add new doctors — credentials sent via email automatically
Set weekly schedule per doctor (working days, hours, slot duration)
Block unavailability — full day or specific time range
Activate / deactivate doctor accounts


Tech Stack
Frontend

React 18 + Vite
Tailwind CSS
React Router v6
Axios

Backend

Node.js + Express
MongoDB + Mongoose
JWT Authentication
Nodemailer (Gmail SMTP)
node-cron (reminder job)
bcrypt

Infrastructure

Frontend → Vercel
Backend → Render
Database → MongoDB Atlas


Project Structure
medibook/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js               # Axios instances (patient, doctor, admin)
│   │   ├── components/
│   │   │   ├── Logo.jsx
│   │   │   ├── Sidebar.jsx            # Doctor + Admin sidebars
│   │   │   ├── StatusBadge.jsx
│   │   │   └── StepIndicator.jsx
│   │   ├── pages/
│   │   │   ├── EmailVerification.jsx
│   │   │   ├── OtpVerification.jsx
│   │   │   ├── DoctorList.jsx
│   │   │   ├── BookAppointment.jsx
│   │   │   ├── BookingConfirmation.jsx
│   │   │   ├── CancelAppointment.jsx
│   │   │   ├── doctor/
│   │   │   │   ├── DoctorLogin.jsx
│   │   │   │   ├── ChangePassword.jsx
│   │   │   │   └── DoctorDashboard.jsx
│   │   │   └── admin/
│   │   │       ├── AdminLogin.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminAppointments.jsx
│   │   │       └── AdminDoctors.jsx
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── config/
    │   │   └── db.js
    │   ├── controllers/
    │   │   ├── appointmentController.js
    │   │   ├── authController.js
    │   │   ├── doctorController.js
    │   │   ├── scheduleController.js
    │   │   └── adminController.js
    │   ├── middleware/
    │   │   ├── auth.js                # Patient JWT
    │   │   ├── doctorAuth.js          # Doctor JWT
    │   │   └── adminAuth.js           # Admin JWT
    │   ├── models/
    │   │   ├── Patient.js
    │   │   ├── Doctor.js
    │   │   ├── Appointment.js
    │   │   ├── DoctorSchedule.js
    │   │   ├── DoctorUnavailability.js
    │   │   ├── Otp.js
    │   │   ├── EmailLog.js
    │   │   └── Admin.js
    │   ├── routes/
    │   │   ├── auth.js
    │   │   ├── appointments.js
    │   │   ├── doctors.js
    │   │   ├── admin.js
    │   │   └── doctor.js
    │   ├── services/
    │   │   └── emailService.js
    │   ├── jobs/
    │   │   └── reminderJob.js
    │   ├── scripts/
    │   │   └── seedAdmin.js
    │   ├── utils/
    │   │   ├── otpUtils.js
    │   │   └── slotUtils.js
    │   └── index.js
    └── package.json
