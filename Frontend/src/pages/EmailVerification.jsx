import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'
import { useAuth } from '../context/AuthContext'
import { useClinic } from '../context/ClinicContext'

export default function EmailVerification() {
  const [contactType, setContactType] = useState('email') // 'email' | 'phone'
  const [contactValue, setContactValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { saveContact } = useAuth()
  const { clinicName } = useClinic()

  const requestOtp = () => api.post('/auth/request', {
    contact_value: contactValue.trim(),
    contact_type: contactType,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Only the OTP request lives in the try/catch — post-request UI work
    // must never be misreported as a send failure.
    try {
      try {
        await requestOtp()
      } catch (err) {
        // No response at all → transient network blip (e.g. dev server
        // restart). Retry once before surfacing an error.
        if (err.response) throw err
        await new Promise(r => setTimeout(r, 1000))
        await requestOtp()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send the code. Please try again.')
      setLoading(false)
      return
    }
    saveContact?.(contactValue.trim(), contactType)
    navigate('/verify-otp')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex flex-col">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <Logo showClinicName />
          <div className="h-8 w-px bg-gray-100" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Book appointment</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-4 py-2 transition hover:bg-gray-50 flex items-center gap-2 font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
                <circle cx="11" cy="8" r="3.5" stroke="#1d7f72" strokeWidth="1.8" />
                <path d="M4.5 18.5c0-3.314 2.91-5.5 6.5-5.5s6.5 2.186 6.5 5.5" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="text-3xl font-display font-semibold text-center text-gray-900 mb-2">
              Let's verify it's you
            </h1>
            <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
              To book at <span className="font-semibold text-gray-700">{clinicName}</span>, we'll send a
              one-time code — no password, no account to create.
            </p>

            {/* Contact type toggle */}
            <div className="mb-5 flex rounded-xl bg-gray-50 border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => { setContactType('email'); setContactValue(''); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition
                  ${contactType === 'email' ? 'bg-white text-brand-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1.5" y="3" width="13" height="10" rx="2" />
                  <path d="M2 4.5l6 4.5 6-4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Email
              </button>
              <button
                type="button"
                onClick={() => { setContactType('phone'); setContactValue(''); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition
                  ${contactType === 'phone' ? 'bg-white text-brand-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4.5" y="1.5" width="7" height="13" rx="1.8" />
                  <path d="M7 12.5h2" strokeLinecap="round" />
                </svg>
                Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  {contactType === 'email' ? 'Email address' : 'Phone number'}
                </label>
                <input
                  autoFocus
                  type={contactType === 'email' ? 'email' : 'tel'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={contactType === 'email' ? 'name@email.com' : '+91 98765 43210'}
                  required
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3.5 text-base transition placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <p className="mt-2 text-xs text-gray-400">
                  {contactType === 'email'
                    ? 'Your appointment confirmation will be sent here.'
                    : 'Your appointment confirmation will be sent to this number by SMS.'}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
                    <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Sending code...
                  </>
                ) : 'Send verification code'}
              </button>
            </form>

            <p className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400 leading-relaxed">
              We only use this to confirm your identity and send appointment updates.
              Returning patients are recognised automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
