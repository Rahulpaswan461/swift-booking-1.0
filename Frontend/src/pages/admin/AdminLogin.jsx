import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/axios'
import Logo from '../../components/Logo'

export default function AdminLogin() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [show, setShow]       = useState(false)
  const navigate              = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.post('/admin/login', form)
      localStorage.setItem('admin_token', res?.data?.token)
      localStorage.setItem('admin', JSON.stringify(res?.data?.admin))
      navigate('/admin/dashboard')
    } catch (err) {
      console.log("error occured while login : ")
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex flex-col">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <Logo />
        <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 uppercase tracking-wider">Admin Portal</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 animate-fade-up">
            {/* Icon with gradient background */}
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-8 mx-auto">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="9" width="16" height="11" rx="2" stroke="#475569" strokeWidth="1.8"/>
                <path d="M7 9V7a4 4 0 018 0v2" stroke="#475569" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="14.5" r="1.5" fill="#475569"/>
              </svg>
            </div>

            <h1 className="text-3xl font-display font-semibold text-center text-gray-900 mb-2">
              Admin Portal
            </h1>
            <p className="text-gray-500 text-center text-sm mb-8">
              Sign in to manage the clinic and monitor operations
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Email address</label>
                <input type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="admin@clinic.com" required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition hover:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••" required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition hover:border-gray-300"
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5"/>
                    <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-700/20">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </>
                ) : 'Access admin panel'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                🔒 <span className="font-medium text-gray-600">Secure & encrypted</span> - Admin activity monitored
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
