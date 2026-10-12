import { StaffHeader } from '../../components/StaffUI'
import { useState, useEffect } from 'react'
import { AdminSidebar } from '../../components/Sidebar'
import { adminApi } from '../../api/axios'
import ClinicHero from '../../components/ClinicHero'
import ClinicVisitGuide from '../../components/ClinicVisitGuide'
import { generatePalette } from '../../utils/theme'
import { clinicUrl } from '../../utils/clinicUrl'

const PRESET_COLORS = [
  { name: 'Teal', value: '#1d7f72' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Slate', value: '#475569' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/**
 * Live preview of the patient booking page header,
 * rendered with the branding currently in the form.
 */
function BookingPagePreview({ form, clinicName, clinic, hours }) {
  const name = form.clinic_name || clinicName || 'Your Clinic'
  const hex = /^#[0-9a-f]{6}$/i.test(form.primary_color) ? form.primary_color : '#1d7f72'
  const theme = Object.fromEntries(Object.entries(generatePalette(hex)).map(([shade, rgb]) => [`--brand-${shade}`, rgb.join(' ')]))
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" style={theme}>
    <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">Patient booking page · Live preview</div>
    <div className="border-b border-gray-100 px-5 py-4 font-display font-semibold text-gray-900">{name}</div>
    {/* Keep positioned preview content inside its own scroll area. */}
    <div className="relative max-h-[720px] overflow-y-auto">
    <ClinicHero preview clinicName={name} logoUrl={form.logo_url} tagline={form.tagline} badges={form.badges || []} />
    <ClinicVisitGuide preview clinic={{ ...clinic, operating_hours: hours }} clinicName={name} />
    </div>
  </div>
}

export default function BrandingSettings() {
  const [clinic, setClinic] = useState(null)
  const [form, setForm] = useState({
    clinic_name: '',
    primary_color: '',
    logo_url: '',
    tagline: '',
    badges: [],
  })
  const [badgeInput, setBadgeInput] = useState('')
  const [hours, setHours] = useState({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], open: '09:00', close: '18:00' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    adminApi.get('/admin/clinic/me')
      .then(res => {
        const data = res.data.data
        setClinic(data)
        const branding = data?.branding || {}
        setForm({
          clinic_name: branding.clinic_name || data?.name || '',
          primary_color: branding.primary_color || '',
          logo_url: branding.logo_url || '',
          tagline: branding.tagline || '',
          badges: branding.badges || [],
        })
        if (data?.operating_hours) setHours(data.operating_hours)
      })
      .catch(() => {
        const admin = JSON.parse(localStorage.getItem('admin') || '{}')
        setForm(prev => ({ ...prev, clinic_name: admin.clinicName || '' }))
        if (admin.clinicSlug) {
          setClinic({ id: admin.clinic_id, name: admin.clinicName, slug: admin.clinicSlug })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const bookingUrl = clinic ? (clinic.subdomain_url || clinicUrl(clinic.slug)) : ''

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await adminApi.patch('/admin/clinic/branding', form)
      flash('Branding saved — your booking page is updated.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update branding.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHours = async () => {
    setError('')
    setSavingHours(true)
    try {
      await adminApi.patch('/admin/clinic/settings', { operating_hours: hours })
      flash('Operating hours saved.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save operating hours.')
    } finally {
      setSavingHours(false)
    }
  }

  const toggleDay = (day) => {
    setHours(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }))
  }

  if (loading) return (
    <div className="staff-workspace flex min-h-screen">
      <AdminSidebar />
      <main className="staff-content flex-1 flex items-center justify-center text-gray-400 text-sm gap-2 pt-14 md:pt-0">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Loading settings...
      </main>
    </div>
  )

  return (
    <div className="staff-workspace flex min-h-screen">
      <AdminSidebar />

      <main className="staff-content flex-1 overflow-auto p-4 pt-20 sm:p-6 sm:pt-20 md:p-8">
        <StaffHeader title="Clinic Settings" description="Branding, booking link, and operating hours" />

        {(success || error) && (
          <div className={`mb-6 max-w-5xl flex items-center gap-2 rounded-xl border px-4 py-3 text-sm
            ${success ? 'border-green-100 bg-green-50 text-green-600' : 'border-red-100 bg-red-50 text-red-600'}`}>
            {success || error}
          </div>
        )}

        <div className="grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          {/* ── Left: settings forms ─────────────────────────── */}
          <div className="space-y-8">
            {/* Booking URL */}
            <section className="rounded-2xl border border-surface-100 bg-white p-6">
              <h2 className="font-semibold text-ink-900 mb-1">Your booking link</h2>
              <p className="text-xs text-gray-400 mb-4">Share this with patients — it's their door to your clinic.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-brand-700 font-semibold">
                  {bookingUrl || '—'}
                </code>
                <button
                  type="button"
                  onClick={copyBookingUrl}
                  disabled={!bookingUrl}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition whitespace-nowrap
                    ${copied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </section>

            {/* Branding — gated by plan entitlements */}
            {clinic?.entitlements?.features?.customBranding === false ? (
              <section className="rounded-2xl border border-surface-100 bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="#1d7f72" strokeWidth="1.5">
                    <rect x="3" y="8" width="12" height="8" rx="2"/>
                    <path d="M6 8V6a3 3 0 016 0v2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="font-display text-lg font-semibold text-ink-900">Custom branding is a Growth feature</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                  Add your logo, brand color, tagline, and credential badges to your booking page
                  with the Growth plan (₹299/month) or above.
                </p>
                <a href="/admin/billing"
                  className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700">
                  View plans & upgrade
                </a>
              </section>
            ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-surface-100 bg-white p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-ink-900 mb-1">Branding</h2>
                <p className="text-xs text-gray-400">Changes apply to your patient booking page — watch the preview.</p>
              </div>

              <div>
                <label htmlFor="brandingsettings-field-1" className="block text-sm font-semibold text-gray-700 mb-2">Clinic display name</label>
                <input id="brandingsettings-field-1"
                  type="text"
                  value={form.clinic_name}
                  onChange={e => setForm({ ...form, clinic_name: e.target.value })}
                  placeholder="Apollo Physiotherapy"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div>
                <label htmlFor="brandingsettings-field-2" className="block text-sm font-semibold text-gray-700 mb-2">Tagline</label>
                <input id="brandingsettings-field-2"
                  type="text"
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Your trusted healthcare partner"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <p className="text-xs text-gray-400 mt-1">A short line shown under your clinic name on the booking page</p>
              </div>

              <div>
                <label htmlFor="brandingsettings-field-3" className="block text-sm font-semibold text-gray-700 mb-2">Logo URL</label>
                <input id="brandingsettings-field-3"
                  type="url"
                  value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, or SVG — shown in the booking page header</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Credentials & badges <span className="font-normal text-gray-400">(optional, up to 4)</span>
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Real accreditations or certifications only — shown on your booking page to build patient trust
                  (e.g. "NABH Accredited", "ISO 9001 Certified").
                </p>
                {form.badges.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {form.badges.map((badge) => (
                      <span key={badge}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {badge}
                        <button type="button"
                          onClick={() => setForm({ ...form, badges: form.badges.filter(b => b !== badge) })}
                          className="ml-0.5 text-brand-400 hover:text-brand-700 transition">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {form.badges.length < 4 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={badgeInput}
                      maxLength={48}
                      onChange={e => setBadgeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const v = badgeInput.trim()
                          if (v && !form.badges.includes(v)) {
                            setForm({ ...form, badges: [...form.badges, v] })
                            setBadgeInput('')
                          }
                        }
                      }}
                      aria-label="Credential or accreditation badge" placeholder="NABH Accredited"
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = badgeInput.trim()
                        if (v && !form.badges.includes(v)) {
                          setForm({ ...form, badges: [...form.badges, v] })
                          setBadgeInput('')
                        }
                      }}
                      className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
                    >
                      Add badge
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Primary color</label>
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm({ ...form, primary_color: color.value })}
                      className={`w-9 h-9 rounded-xl border-2 transition-all ${
                        form.primary_color === color.value
                          ? 'border-gray-900 scale-110 shadow-lg'
                          : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    aria-label="Custom primary color" type="color"
                    value={form.primary_color || '#1d7f72'}
                    onChange={e => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={e => setForm({ ...form, primary_color: e.target.value })}
                    placeholder="#1d7f72"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </form>
            )}

            {/* Operating hours */}
            <section className="rounded-2xl border border-surface-100 bg-white p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-ink-900 mb-1">Operating hours</h2>
                <p className="text-xs text-gray-400">Your clinic's overall working days and hours</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Working days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition ${
                        hours.days.includes(day)
                          ? 'bg-brand-100 text-brand-700 border border-brand-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brandingsettings-field-4" className="block text-sm font-semibold text-gray-700 mb-2">Opens at</label>
                  <input id="brandingsettings-field-4"
                    type="time"
                    value={hours.open}
                    onChange={e => setHours({ ...hours, open: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label htmlFor="brandingsettings-field-5" className="block text-sm font-semibold text-gray-700 mb-2">Closes at</label>
                  <input id="brandingsettings-field-5"
                    type="time"
                    value={hours.close}
                    onChange={e => setHours({ ...hours, close: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {hours.days.length > 0
                    ? `Open ${hours.days.join(', ')} · ${formatTime(hours.open)} – ${formatTime(hours.close)}`
                    : 'Select at least one working day'}
                </p>
                <button
                  type="button"
                  onClick={handleSaveHours}
                  disabled={savingHours || hours.days.length === 0}
                  className="px-6 py-3 rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingHours ? 'Saving...' : 'Save Hours'}
                </button>
              </div>
            </section>
          </div>

          {/* ── Right: live preview ──────────────────────────── */}
          <div className="lg:sticky lg:top-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Live preview</p>
            <BookingPagePreview form={form} clinicName={clinic?.name} clinic={clinic} hours={hours} />
            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              This is how your booking page header will look to patients. Save to publish the changes.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
