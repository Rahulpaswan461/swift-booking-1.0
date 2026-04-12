import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Patient pages
import EmailVerification   from './pages/EmailVerification'
import OtpVerification     from './pages/OtpVerification'
import DoctorList          from './pages/DoctorList'
import BookAppointment     from './pages/BookAppointment'
import BookingConfirmation from './pages/BookingConfirmation'

// Doctor pages
import DoctorLogin     from './pages/doctor/DoctorLogin'
import ChangePassword  from './pages/doctor/ChangePassword'
import DoctorDashboard from './pages/doctor/DoctorDashboard'

// Admin pages
import AdminLogin        from './pages/admin/AdminLogin'
import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminDoctors      from './pages/admin/AdminDoctors'

// Route guards
function PatientRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/" replace />
}

function DoctorRoute({ children }) {
  return localStorage.getItem('doctor_token') ? children : <Navigate to="/doctor/login" replace />
}

function AdminRoute({ children }) {
   console.log('AdminRoute check — token:', children)  // add this
  return localStorage.getItem('admin_token') ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Patient flow ───────────────────────────── */}
        <Route path="/"              element={<EmailVerification />} />
        <Route path="/verify-otp"    element={<OtpVerification />} />
        <Route path="/doctors"       element={<PatientRoute><DoctorList /></PatientRoute>} />
        <Route path="/book/:doctorId" element={<PatientRoute><BookAppointment /></PatientRoute>} />
        <Route path="/confirmation"  element={<PatientRoute><BookingConfirmation /></PatientRoute>} />

        {/* ── Doctor flow ────────────────────────────── */}
        <Route path="/doctors/login"            element={<DoctorLogin />} />
        <Route path="/doctors/change-password"  element={<DoctorRoute><ChangePassword /></DoctorRoute>} />
        <Route path="/doctors/dashboard"        element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />

        {/* ── Admin flow ─────────────────────────────── */}
        <Route path="/admin/login"        element={<AdminLogin />} />
        <Route path="/admin/dashboard"    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/appointments" element={<AdminRoute><AdminAppointments /></AdminRoute>} />
        <Route path="/admin/doctors/create"      element={<AdminRoute><AdminDoctors /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
