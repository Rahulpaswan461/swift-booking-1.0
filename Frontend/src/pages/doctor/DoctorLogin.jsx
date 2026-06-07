import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api/axios'
import Logo from '../../components/Logo'

export default function DoctorLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await doctorApi.post('/doctors/login', form)
      localStorage.setItem('doctor_token', res.data.token)
      localStorage.setItem('doctor', JSON.stringify(res.data.doctor))
      console.log("cred after first login: ", res)

      if (res.data.first_login) {
        navigate('/doctor/change-password')
      } else {
        navigate('/doctor/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex flex-col">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <Logo />
        <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5 uppercase tracking-wider">Doctor Portal</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 animate-fade-up">
            {/* Icon with gradient background */}
            <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 rounded-2xl flex items-center justify-center mb-8 mx-auto">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8" r="4" stroke="#0171be" strokeWidth="1.8" />
                <path d="M3 19c0-4 3.582-7 8-7s8 3 8 7" stroke="#0171be" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="text-3xl font-display font-semibold text-center text-gray-900 mb-2">
              Doctor Login
            </h1>
            <p className="text-gray-500 text-center text-sm mb-8">
              Sign in to manage your appointments and schedule
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="doctor@clinic.com"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition hover:border-gray-300"
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {show ? (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
                    <path d="M7 4v3M7 9.5v .5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-600/20">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in to dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                💡 <span className="font-medium text-gray-600">Secure login</span> - Your data is encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
