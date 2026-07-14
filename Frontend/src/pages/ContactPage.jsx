import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import PlatformHeader from '../components/PlatformHeader'

export default function ContactPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', clinic_name: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api.post('/support', { ...form, source: 'website' })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const input = "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"

  return (
    <div className="min-h-screen bg-surface-50">
      <PlatformHeader />

      <main className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left: intro */}
        <div className="animate-fade-up">
          <h1 className="font-display text-4xl font-semibold text-ink-900 sm:text-5xl">Talk to us</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Questions, feedback, or need help setting up your clinic? We read every message
            and reply personally — usually within a day.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#1d7f72" strokeWidth="1.5">
                  <rect x="1.5" y="3" width="13" height="10" rx="2" />
                  <path d="M2 4.5l6 4.5 6-4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              support@medibook.in
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#1d7f72" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" />
                </svg>
              </span>
              Replies within 24 hours — Early Access clinics get priority
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="rounded-[28px] border border-surface-100 bg-white p-7 shadow-sm animate-fade-up delay-100 sm:p-9">
          {sent ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 animate-scale-in">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mb-2 font-display text-2xl font-semibold text-ink-900">Message sent</h2>
              <p className="text-sm text-gray-500">Thanks for reaching out — we'll reply to your email soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Your name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Asha Rao" className={input} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@clinic.com" className={input} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Clinic name <span className="font-normal text-gray-400">(optional)</span></label>
                <input type="text" value={form.clinic_name} onChange={e => setForm({ ...form, clinic_name: e.target.value })} placeholder="Apollo Physiotherapy" className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Subject</label>
                <input type="text" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="How do I…" className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Message</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you need help with…" className={`${input} resize-none`} />
              </div>
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}
              <button type="submit" disabled={sending}
                className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60">
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
