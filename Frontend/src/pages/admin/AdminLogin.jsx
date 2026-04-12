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
      <header className="px-8 py-5 flex items-center justify-between">
        <Logo />
        <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1.5">Admin Portal</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-up">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-5">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="9" width="16" height="11" rx="2" stroke="#0171be" strokeWidth="1.8"/>
                <path d="M7 9V7a4 4 0 018 0v2" stroke="#0171be" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="11" cy="14.5" r="1.5" fill="#0171be"/>
              </svg>
            </div>

            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-1">Admin login</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to manage the clinic</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                <input type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="admin@clinic.com" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••" required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                  />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5"/>
                    <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in to admin panel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
