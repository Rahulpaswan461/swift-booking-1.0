import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, doctorApi } from '../api/axios'
import { useClinic } from '../context/ClinicContext'
import Logo from './Logo'

export default function StaffLogin({ role }) {
  const isDoctor = role === 'doctor'
  const portal = isDoctor ? 'Doctor' : 'Admin'
  const { clinicName, hasTenant } = useClinic()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const navigate = useNavigate()
  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await (isDoctor ? doctorApi : adminApi).post(`/${role}/login`, form)
      localStorage.setItem(`${role}_token`, data.token)
      localStorage.setItem(role, JSON.stringify(data[role]))
      navigate(isDoctor && data.first_login ? '/doctor/change-password' : `/${role}/dashboard`)
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Please try again.')
    } finally { setLoading(false) }
  }
  const inputClass = 'w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100'
  return <div className="staff-auth flex min-h-screen flex-col">
    <header className="flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5 sm:px-8">
      <Logo showClinicName={hasTenant} />
      <span className="shrink-0 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">{portal} portal</span>
    </header>
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-[28px] border border-surface-100 bg-white p-8 shadow-xl shadow-gray-900/5 animate-fade-up sm:p-10" aria-labelledby="staff-login-title">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-brand-100 bg-brand-50 text-brand-600" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="9" width="16" height="11" rx="2" /><path d="M7 9V7a4 4 0 018 0v2" strokeLinecap="round"/><circle cx="11" cy="14.5" r="1.5" /></svg>
        </div>
        <h1 id="staff-login-title" className="mb-2 text-center font-display text-3xl font-semibold text-gray-900">{portal} sign in</h1>
        <p className="mb-8 text-center text-sm text-gray-500">{hasTenant ? `${clinicName} · ` : ''}{isDoctor ? 'Your appointments and patient care.' : 'Your clinic, team, and appointments.'}</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="staff-email" className="mb-2 block font-semibold">Email address</label><input id="staff-email" type="email" autoComplete="username" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={isDoctor ? 'doctor@clinic.com' : 'admin@clinic.com'} required className={inputClass} /></div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="staff-password" className="font-semibold">Password</label><Link to={`/${role}/forgot-password`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Forgot password?</Link></div>
            <div className="relative"><input id="staff-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:text-brand-700"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"/><circle cx="8" cy="8" r="2"/>{show && <path d="m3 3 10 10"/>}</svg></button></div>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-6 border-t border-gray-100 pt-6 text-center"><Link to="/" className="text-sm font-medium text-brand-700 hover:text-brand-800">{hasTenant ? 'Back to clinic page' : 'Back to Healibrate'}</Link></div>
      </section>
    </main>
  </div>
}
