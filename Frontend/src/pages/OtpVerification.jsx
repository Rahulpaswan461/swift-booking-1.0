import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'

export default function OtpVerification() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(60)
  const refs = useRef([])
  const navigate = useNavigate()
  const email = localStorage.getItem('otp_email')

  useEffect(() => {
    if (!email) navigate('/')
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
      const res = await api.post('/auth/verify-otp', { email, otp: code })
      localStorage.setItem('token', res.data.token)
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
      await api.post('/auth/send-otp', { email })
      setSuccess('New OTP sent!')
      setCountdown(60)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex flex-col">
      <header className="px-8 py-5">
        <Logo />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <StepIndicator current={1} />

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-up">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="8" width="16" height="12" rx="2" stroke="#0171be" strokeWidth="1.8"/>
                <path d="M7 8V6a4 4 0 018 0v2" stroke="#0171be" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="14" r="1.5" fill="#0171be"/>
              </svg>
            </div>

            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-1">
              Enter your code
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a 6-digit code to <span className="font-medium text-gray-700">{maskedEmail}</span>
            </p>

            {/* OTP Input Grid */}
            <div className="flex gap-2.5 mb-5" onPaste={handlePaste}>
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
                  className={`w-full aspect-square text-center text-xl font-semibold border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition
                    ${digit ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 bg-gray-50 text-gray-900'}
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5"/>
                  <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#16a34a" strokeWidth="1.5"/>
                  <path d="M4 7l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {success}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 text-brand-600 text-sm py-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#0171be" strokeWidth="2" strokeOpacity="0.3"/>
                  <path d="M14 8a6 6 0 00-6-6" stroke="#0171be" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Verifying...
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-4">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                ← Change email
              </button>
              <button
                onClick={handleResend}
                disabled={countdown > 0 || resending}
                className="text-sm font-medium text-brand-600 hover:text-brand-800 disabled:text-gray-300 disabled:cursor-not-allowed transition"
              >
                {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
