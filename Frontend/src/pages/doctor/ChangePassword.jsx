import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api/axios'
import Logo from '../../components/Logo'

export default function ChangePassword() {
  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const navigate              = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirm) {
      return setError('Passwords do not match.')
    }
    if (form.newPassword.length < 8) {
      return setError('Password must be at least 8 characters.')
    }

    setLoading(true)
    try {
      await doctorApi.patch('/doctor/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      })
      // Update stored doctor to reflect first_login: false
      const doctor = JSON.parse(localStorage.getItem('doctor') || '{}')
      localStorage.setItem('doctor', JSON.stringify({ ...doctor, first_login: false }))
      navigate('/doctor/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  const rules = [
    { label: 'At least 8 characters',    pass: form.newPassword.length >= 8 },
    { label: 'One uppercase letter',      pass: /[A-Z]/.test(form.newPassword) },
    { label: 'One number',                pass: /[0-9]/.test(form.newPassword) },
    { label: 'Passwords match',           pass: form.newPassword && form.newPassword === form.confirm },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-brand-50 flex flex-col">
      <header className="px-8 py-5"><Logo /></header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#d97706" strokeWidth="1.5"/>
              <path d="M8 5v4M8 11v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">First time login</p>
              <p className="text-xs text-amber-600 mt-0.5">You must set a new password before continuing.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-up">
            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-1">Set new password</h1>
            <p className="text-gray-500 text-sm mb-6">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { key: 'currentPassword', label: 'Temporary password',  placeholder: 'Enter your temp password' },
                { key: 'newPassword',     label: 'New password',         placeholder: 'Min 8 characters' },
                { key: 'confirm',         label: 'Confirm new password', placeholder: 'Re-enter new password' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{field.label}</label>
                  <input
                    type="password"
                    value={form[field.key]}
                    onChange={e => setForm({...form, [field.key]: e.target.value})}
                    placeholder={field.placeholder}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              ))}

              {/* Password rules */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {rules.map(rule => (
                  <div key={rule.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                      ${rule.pass ? 'bg-green-500' : 'bg-gray-200'}`}>
                      {rule.pass && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs transition-colors ${rule.pass ? 'text-green-700' : 'text-gray-400'}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
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

              <button type="submit" disabled={loading || !rules.every(r => r.pass)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
                      <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Saving...
                  </>
                ) : 'Set new password →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
