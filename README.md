# 🏥 Healibrate — Clinic Appointment Booking System

A full-stack **SaaS appointment booking system** built for clinics.
Patients can book appointments via OTP verification, doctors manage schedules, and admins control everything from a centralized dashboard.

---

## 🌐 Live Links

* **Frontend:** https://swift-booking-1-0.vercel.app/
* **Backend API:** https://swift-booking-1-0-1.onrender.com

---

## ✨ Features

### 👤 Patient

* Email OTP verification (no password required)
* Browse doctors by specialization
* View real-time available slots
* Book appointments with confirmation email
* Cancel appointments via secure email link
* 24-hour reminder email before appointment

---

### 🩺 Doctor

* Secure login with forced password change on first login
* Daily appointment dashboard with date navigation
* Mark appointments as:

  * Completed
  * No-show
* Daily summary stats:

  * Total
  * Pending
  * Completed
  * No-show

---

### 🛠️ Admin

* Dashboard with:

  * Today’s stats
  * Weekly stats
  * All-time stats
* Per-doctor appointment breakdown
* Full appointment table with filters:

  * Date
  * Doctor
  * Status
* Add new doctors (credentials sent via email)
* Configure weekly schedules:

  * Working days
  * Working hours
  * Slot duration
* Block unavailability:

  * Full day
  * Custom time range
* Activate / deactivate doctor accounts

---

## 🧱 Tech Stack

### Frontend

* React 18 + Vite
* Tailwind CSS
* React Router v6
* Axios

### Backend

* Node.js + Express
* MongoDB + Mongoose
* JWT Authentication
* Nodemailer (Gmail SMTP)
* node-cron (reminder jobs)
* bcrypt

### Infrastructure

* Frontend → Vercel
* Backend → Render
* Database → MongoDB Atlas

---

## 📁 Project Structure

```bash
healibrate/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── components/
│   │   │   ├── Logo.jsx
│   │   │   ├── Sidebar.jsx
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
    │   │   ├── auth.js
    │   │   ├── doctorAuth.js
    │   │   └── adminAuth.js
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
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/healibrate.git
cd healibrate
```

### 2. Setup Backend

```bash
cd backend
npm install
npm start
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:5173
```

---

## 📌 Future Improvements

* Payment integration
* SMS notifications
* Multi-clinic support
* Doctor ratings & reviews
* Mobile app (React Native)

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss.

---

## 📄 License

This project is licensed under the MIT License.

---

## 💡 Author

Built with ❤️ by Rahul
