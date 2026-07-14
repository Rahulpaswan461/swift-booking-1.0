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
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="flex items-center justify-between border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <Logo />
        <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">Admin Portal</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-surface-100 bg-white p-8 shadow-xl shadow-gray-900/5 animate-fade-up sm:p-10">
            {/* Icon with gradient background */}
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-brand-100 bg-brand-50">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="9" width="16" height="11" rx="2" stroke="#1d7f72" strokeWidth="1.8"/>
                <path d="M7 9V7a4 4 0 018 0v2" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="14.5" r="1.5" fill="#1d7f72"/>
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
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••" required
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 pr-11 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
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
                <span className="font-medium text-gray-600">Secure and encrypted</span> - Admin activity monitored
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
