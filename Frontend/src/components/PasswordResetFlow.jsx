import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, doctorApi } from '../api/axios'
import Logo from './Logo'

/**
 * Password reset for clinic staff — shared by the admin and doctor portals.
 *
 * Both roles use the identical two-step flow (request a code, then set a new
 * password), so this component is parameterised by role rather than duplicated.
 *
 * The code is short-lived, so the UI shows a live countdown and a resend
 * control instead of letting the user discover expiry by failing.
 */

const ROLE_CONFIG = {
  admin: {
    api: adminApi,
    basePath: '/admin',
    loginPath: '/admin/login',
    badge: 'Admin Portal',
    emailPlaceholder: 'admin@clinic.com',
  },
  doctor: {
    api: doctorApi,
    basePath: '/doctor',
    loginPath: '/doctor/login',
    badge: 'Doctor Portal',
    emailPlaceholder: 'doctor@clinic.com',
  },
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100'

function Alert({ tone, children }) {
  const tones = {
    error: 'text-red-600 bg-red-50 border-red-200',
    success: 'text-green-700 bg-green-50 border-green-200',
    info: 'text-brand-800 bg-brand-50 border-brand-200',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
  )
}

export default function PasswordResetFlow({ role }) {
  const config = ROLE_CONFIG[role]

  // 'request' → ask for the email; 'confirm' → enter code + new password
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [done, setDone] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // Countdown to expiry. The code is short-lived, so make that visible rather
  // than letting the user find out by submitting an expired one.
  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  const requestCode = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await config.api.post(`${config.basePath}/forgot-password`, { email })
      setNotice(res.data?.message || 'If an account exists for that email, we\'ve sent a reset code.')
      setStep('confirm')
      setSecondsLeft(60)
    } catch {
      setError('Could not send the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitNewPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await config.api.post(`${config.basePath}/reset-password`, { email, otp, newPassword })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="flex items-center justify-between border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <Logo />
        <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
          {config.badge}
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="animate-fade-up rounded-[28px] border border-surface-100 bg-white p-8 shadow-xl shadow-gray-900/5 sm:p-10">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-brand-100 bg-brand-50">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="9" width="16" height="11" rx="2" stroke="#1d7f72" strokeWidth="1.8" />
                <path d="M7 9V7a4 4 0 018 0v2" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="11" cy="14.5" r="1.5" fill="#1d7f72" />
              </svg>
            </div>

            {done ? (
              <div className="text-center">
                <h1 className="mb-2 text-center font-display text-3xl font-semibold text-gray-900">
                  Password updated
                </h1>
                <p className="mb-8 text-center text-sm text-gray-500">
                  You can now sign in with your new password.
                </p>
                <Link
                  to={config.loginPath}
                  className="flex w-full items-center justify-center rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <h1 className="mb-2 text-center font-display text-3xl font-semibold text-gray-900">
                  Forgot password
                </h1>
                <p className="mb-8 text-center text-sm text-gray-500">
                  {step === 'request'
                    ? 'Enter your email and we\'ll send you a reset code'
                    : 'Enter the code we emailed you and choose a new password'}
                </p>

                {step === 'request' ? (
                  <form onSubmit={requestCode} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Email address
                      </label>
                      <input
                        type="email" value={email} required
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={config.emailPlaceholder}
                        className={inputClass}
                      />
                    </div>

                    {error && <Alert tone="error">{error}</Alert>}

                    <button
                      type="submit" disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Sending code…' : 'Send reset code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={submitNewPassword} className="space-y-5">
                    {notice && <Alert tone="info">{notice}</Alert>}

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Reset code
                      </label>
                      <input
                        type="text" value={otp} required
                        inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className={`${inputClass} text-center text-lg font-semibold tracking-[0.4em]`}
                      />
                      <p className="mt-2 text-center text-xs text-gray-400">
                        {secondsLeft > 0
                          ? `Expires in ${secondsLeft}s`
                          : 'Your code may have expired — resend to get a new one.'}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                        New password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword} required minLength={8}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                        >
                          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {error && <Alert tone="error">{error}</Alert>}

                    <button
                      type="submit" disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Updating…' : 'Set new password'}
                    </button>

                    <button
                      type="button" onClick={requestCode} disabled={loading}
                      className="w-full text-center text-xs font-semibold text-brand-700 transition hover:text-brand-800 disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </form>
                )}

                <div className="mt-6 border-t border-gray-100 pt-6 text-center">
                  <Link to={config.loginPath} className="text-xs font-semibold text-gray-500 transition hover:text-gray-700">
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
