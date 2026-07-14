import { useState } from 'react'
import { adminApi } from '../api/axios'

/**
 * In-app help widget for clinic staff — prefilled from the logged-in
 * admin, submits to /api/support (source: admin_panel).
 */
export default function SupportModal({ onClose }) {
  const admin = JSON.parse(localStorage.getItem('admin') || '{}')
  const [form, setForm] = useState({
    name: admin.fullName || '',
    email: admin.email || '',
    clinic_name: admin.clinicName || '',
    subject: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await adminApi.post('/support', { ...form, source: 'admin_panel' })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const input = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-up">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900">Help & support</h2>
            <p className="text-xs text-gray-400">We usually reply within a day — Early Access clinics get priority.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900">Message sent</p>
            <p className="mt-1 text-sm text-gray-500">We'll reply to {form.email} soon.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Subject</label>
              <input type="text" required autoFocus value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="What do you need help with?" className={input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Message</label>
              <textarea required rows={4} value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the issue or question…" className={`${input} resize-none`} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reply-to email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} className={input} />
            </div>
            {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
            <button type="submit" disabled={sending}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60">
              {sending ? 'Sending…' : 'Send to MediBook support'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
