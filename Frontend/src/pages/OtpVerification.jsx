import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'
import { useAuth } from '../context/AuthContext'

export default function OtpVerification() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Matches the backend OTP TTL (30s) — doubles as the expiry indicator
  const OTP_TTL = 30
  const [countdown, setCountdown] = useState(OTP_TTL)
  const refs = useRef([])
  const navigate = useNavigate()
  const { savePatient } = useAuth()

  const contactValue = localStorage.getItem('otp_contact')
  const contactType = localStorage.getItem('otp_contact_type') || 'email'

  useEffect(() => {
    if (!contactValue) navigate('/')
    refs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return
    const newOtp = [...otp]
    newOtp[idx] = val.slice(-1)
    setOtp(newOtp)
    if (val && idx < 5) refs.current[idx + 1]?.focus()
    // Auto-submit when all 6 filled
    if (newOtp.every(d => d) && newOtp.join('').length === 6) {
      submitOtp(newOtp.join(''))
    }
  }

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      submitOtp(pasted)
    }
  }

  const submitOtp = async (code) => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/verify', {
        contact_value: contactValue,
        contact_type: contactType,
        otp_code: code,
      })
      console.log('res ', res)
      // Save patient token AND patient_id using the new context method
      savePatient(res.data.token, res.data.patient_id, contactValue, contactType)

      // Fetch clinic info for branding
      try {
        const clinicRes = await api.get('/clinic/info')
        if (clinicRes.data.data) {
          localStorage.setItem('clinic_info', JSON.stringify(clinicRes.data.data))
        }
      } catch (clinicErr) {
        // Non-critical — clinic info is optional
        console.warn('Failed to fetch clinic info:', clinicErr)
      }

      navigate('/doctors')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      refs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await api.post('/auth/request', {
        contact_value: contactValue,
        contact_type: contactType,
      })
      setSuccess('New OTP sent!')
      setOtp(['', '', '', '', '', ''])
      refs.current[0]?.focus()
      setCountdown(OTP_TTL)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const maskedContact = () => {
    if (contactType === 'email') {
      return contactValue.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    }
    // Phone: show first 3 and last 3, mask the rest
    const digits = contactValue.replace(/\D/g, '')
    return digits.length > 6
      ? digits.slice(0, 3) + '*'.repeat(digits.length - 6) + digits.slice(-3)
      : contactValue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex flex-col">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <Logo showClinicName />
          <div className="h-8 w-px bg-gray-100" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Verification</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-4 py-2 transition hover:bg-gray-50 flex items-center gap-2 font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <StepIndicator current={1} />

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 animate-fade-up">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-brand-200 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="8" width="16" height="12" rx="2" stroke="#0171be" strokeWidth="1.8"/>
                <path d="M7 8V6a4 4 0 018 0v2" stroke="#0171be" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="14" r="1.5" fill="#0171be"/>
              </svg>
            </div>

            <h1 className="text-3xl font-display font-semibold text-center text-gray-900 mb-2">
              Verify your {contactType}
            </h1>
            <p className="text-gray-500 text-sm text-center mb-4">
              We sent a 6-digit verification code to<br/><span className="font-semibold text-gray-700">{maskedContact()}</span>
            </p>

            {/* Expiry countdown — matches backend TTL */}
            <p className={`text-xs text-center mb-6 font-semibold ${countdown > 0 ? 'text-gray-400' : 'text-red-500'}`}>
              {countdown > 0
                ? `Code expires in ${countdown}s`
                : 'Code expired — request a new one below'}
            </p>

            {/* OTP Input Grid */}
            <div className="flex gap-2.5 mb-7" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => refs.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(e.target.value, idx)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  disabled={loading}
                  className={`w-full aspect-square text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition
                    ${digit ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 bg-gray-50 text-gray-900'}
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-200'}`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5"/>
                  <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 text-green-600 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#16a34a" strokeWidth="1.5"/>
                  <path d="M4 7l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{success}</span>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-brand-600 text-sm py-3 mb-4">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#0171be" strokeWidth="2" strokeOpacity="0.3"/>
                  <path d="M14 8a6 6 0 00-6-6" stroke="#0171be" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="font-medium">Verifying your code...</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                onClick={() => navigate('/verify')}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition"
              >
                ← Change {contactType}
              </button>
              <button
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:text-gray-300 disabled:cursor-not-allowed transition"
              >
                {resending ? 'Sending...' : countdown > 0 ? `Resend available in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
