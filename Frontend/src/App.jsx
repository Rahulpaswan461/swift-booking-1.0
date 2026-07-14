import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ClinicProvider, useClinic } from './context/ClinicContext'

// Medibook product page (shown when no tenant is resolved)
import MedibookProductPage from './pages/MedibookProductPage'
import PricingPage from './pages/PricingPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PlatformMetrics from './pages/internal/PlatformMetrics'

// Landing page (shown when a tenant is resolved)
import ClinicLanding from './pages/ClinicLanding'

// Patient pages
import EmailVerification   from './pages/EmailVerification'
import OtpVerification     from './pages/OtpVerification'
import DoctorList          from './pages/DoctorList'
import BookAppointment     from './pages/BookAppointment'
import BookingConfirmation from './pages/BookingConfirmation'
import CancelAppointment   from './pages/CancelAppointment'
import RescheduleAppointment from './pages/RescheduleAppointment'
import PatientHistory      from './pages/PatientHistory'

// Doctor pages
import DoctorLogin     from './pages/doctor/DoctorLogin'
import ChangePassword  from './pages/doctor/ChangePassword'
import DoctorDashboard from './pages/doctor/DoctorDashboard'

// Admin pages
import AdminLogin        from './pages/admin/AdminLogin'
import RegisterClinic    from './pages/admin/RegisterClinic'
import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminDoctors      from './pages/admin/AdminDoctors'
import BrandingSettings  from './pages/admin/BrandingSettings'

// ── Route Guards ──────────────────────────────────────────────

function PatientRoute({ children }) {
  return localStorage.getItem('token') && localStorage.getItem('patient_id')
    ? children
    : <Navigate to="/verify" replace />
}

function DoctorRoute({ children }) {
  return localStorage.getItem('doctor_token') ? children : <Navigate to="/doctor/login" replace />
}

function AdminRoute({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/admin/login" replace />
}

// ── Conditional Layout ────────────────────────────────────────
// When a tenant (clinic) is resolved → show the clinic's patient portal
// When no tenant → show the Medibook product page (for clinic owners)

function ConditionalHome() {
  const { hasTenant, loading } = useClinic();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return hasTenant ? <ClinicLanding /> : <MedibookProductPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClinicProvider>
          <Routes>

            {/* ── Home: conditional based on tenant ──────────── */}
            <Route path="/" element={<ConditionalHome />} />

            {/* ── Medibook platform routes (always accessible) ─ */}
            <Route path="/pricing"            element={<PricingPage />} />
            <Route path="/about"              element={<AboutPage />} />
            <Route path="/contact"            element={<ContactPage />} />
            <Route path="/internal/metrics"   element={<PlatformMetrics />} />
            <Route path="/admin/register"     element={<RegisterClinic />} />
            <Route path="/admin/login"        element={<AdminLogin />} />

            {/* ── Patient flow ─────────────────────────────── */}
            <Route path="/verify"       element={<EmailVerification />} />
            <Route path="/verify-otp"   element={<OtpVerification />} />
            <Route path="/doctors"      element={<PatientRoute><DoctorList /></PatientRoute>} />
            <Route path="/book/:doctorId" element={<PatientRoute><BookAppointment /></PatientRoute>} />
            <Route path="/confirmation" element={<PatientRoute><BookingConfirmation /></PatientRoute>} />
            <Route path="/my-appointments" element={<PatientRoute><PatientHistory /></PatientRoute>} />
            <Route path="/cancel/:id/:cancelToken" element={<CancelAppointment />} />
            <Route path="/reschedule/:id/:cancelToken" element={<RescheduleAppointment />} />

            {/* ── Doctor flow ──────────────────────────────── */}
            <Route path="/doctor/login"            element={<DoctorLogin />} />
            <Route path="/doctor/change-password"  element={<DoctorRoute><ChangePassword /></DoctorRoute>} />
            <Route path="/doctor/dashboard"        element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />

            {/* ── Admin flow (authenticated) ───────────────── */}
            <Route path="/admin/dashboard"    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/appointments" element={<AdminRoute><AdminAppointments /></AdminRoute>} />
            <Route path="/admin/doctors/create" element={<AdminRoute><AdminDoctors /></AdminRoute>} />
            <Route path="/admin/branding"     element={<AdminRoute><BrandingSettings /></AdminRoute>} />

            {/* ── Fallback ─────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ClinicProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
