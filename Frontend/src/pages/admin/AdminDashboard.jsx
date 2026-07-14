import { useState, useEffect } from 'react'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'
import { clinicUrl } from '../../utils/clinicUrl'

function StatCard({ label, value, sub, color, icon }) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: 'bg-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: 'bg-red-100' },
    brand: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-100', icon: 'bg-brand-100' },
  }
  const c = colors[color]
  return (
    <div className={`rounded-2xl border p-5 ${c.bg} ${c.border} animate-fade-up opacity-0`}
      style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
      <p className={`text-sm font-medium mt-0.5 ${c.text} opacity-80`}>{label}</p>
      {sub && <p className={`text-xs mt-1 ${c.text} opacity-60`}>{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clinic, setClinic] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Fetch the logged-in admin's clinic (clinic_id from JWT)
    adminApi.get('/admin/clinic/me')
      .then(res => setClinic(res.data.data))
      .catch(() => {
        // Fallback: use admin data from localStorage
        const admin = JSON.parse(localStorage.getItem('admin') || '{}')
        if (admin.clinic_id) {
          setClinic({ id: admin.clinic_id, name: admin.clinicName || 'Your Clinic', slug: admin.clinicSlug || 'your-clinic' })
        }
      })
  }, [])

  useEffect(() => {
    adminApi.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const subdomainUrl = clinic ? (clinic.subdomain_url || clinicUrl(clinic.slug)) : ''

  const copyToClipboard = () => {
    navigator.clipboard.writeText(subdomainUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const trialDaysRemaining = () => {
    const trialEndsAt = clinic?.trial_ends_at || clinic?.trialEndsAt
    if (!trialEndsAt) return null
    const days = Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  if (loading) return (
    <div className="flex min-h-screen bg-surface-50">
      <AdminSidebar />
      <main className="flex-1 flex items-center justify-center text-gray-400 text-sm gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Loading stats...
      </main>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-surface-50">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-ink-900">{clinic?.name || 'Overview'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Your Booking Page card */}
        {subdomainUrl && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Your Booking Page</p>
                <p className="text-sm text-gray-600">Share this link with patients on WhatsApp, Instagram, or your website</p>
                <p className="text-brand-700 font-semibold mt-1">{subdomainUrl}</p>
              </div>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${copied
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-brand-600 hover:bg-brand-700 text-white border border-brand-600 shadow-sm'}`}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {clinic?.early_access ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4L7 10.2 3.3 12.1l.7-4-3-2.9 4.2-.6L7 1z" stroke="#15803d" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-sm text-green-800">
              <span className="font-bold">Early Access — everything is free.</span>{' '}
              Full access, no limits, no card required.
              Paid plans arrive later and you'll be notified well in advance.
            </p>
          </div>
        ) : trialDaysRemaining() !== null && (
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
              ${trialDaysRemaining() > 0 && trialDaysRemaining() <= 3
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : trialDaysRemaining() > 0
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {trialDaysRemaining() > 0
                ? `Free trial — ${trialDaysRemaining()} day${trialDaysRemaining() > 1 ? 's' : ''} remaining`
                : 'Trial expired — upgrade to continue'}
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Today's Stats */}
            <div className="mb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total booked" value={stats.today.total} color="brand"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="13" rx="2" stroke="#0171be" strokeWidth="1.5" /><path d="M5 1v2M11 1v2M2 6h12" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard label="Confirmed" value={stats.today.confirmed} color="blue"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#1d4ed8" strokeWidth="1.5" /><path d="M5 8l2 2 4-4" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard label="Completed" value={stats.today.completed} color="green"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#15803d" strokeWidth="1.5" /><path d="M5 8l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard label="Cancelled / No-show" value={stats.today.cancelled + stats.today.no_show} color="red"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#b91c1c" strokeWidth="1.5" /><path d="M6 6l4 4M10 6l-4 4" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
              </div>
            </div>

            {/* This week */}
            <div className="mb-2 mt-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This week</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard label="Total this week" value={stats.this_week.total} color="brand"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="13" rx="2" stroke="#0171be" strokeWidth="1.5" /><path d="M5 1v2M11 1v2M2 6h12" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard label="Completed this week" value={stats.this_week.completed} color="green"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#15803d" strokeWidth="1.5" /><path d="M5 8l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard label="Cancelled this week" value={stats.this_week.cancelled} color="amber"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#b45309" strokeWidth="1.5" /><path d="M8 5v3M8 10v.5" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
              </div>
            </div>

            {/* All time */}
            <div className="mt-6 mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All time</h2>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total appointments" value={stats.all_time.total_appointments} color="brand"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="13" rx="2" stroke="#0171be" strokeWidth="1.5" /><path d="M5 1v2M11 1v2M2 6h12" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard label="Active doctors" value={stats.all_time.total_doctors} color="green"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="#15803d" strokeWidth="1.5" /><path d="M2 15c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                />
                <StatCard label="Total patients" value={stats.all_time.total_patients} color="blue"
                  icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="#1d4ed8" strokeWidth="1.5" /><path d="M1 14c0-2.761 2.239-4.5 5-4.5M15 14c0-2.761-1.791-4.5-4-4.5" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="5" r="2" stroke="#1d4ed8" strokeWidth="1.5" /></svg>}
                />
              </div>
            </div>

            {/* Per doctor breakdown */}
            {stats.doctor_breakdown?.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today — per doctor</h2>
                <div className="overflow-hidden rounded-[24px] border border-surface-100 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Doctor</th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-gray-400">Total</th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-gray-400">Pending</th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-gray-400">Completed</th>
                        <th className="px-5 py-3 text-center text-xs font-medium text-gray-400">No Show</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.doctor_breakdown.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{d.doctorName}</p>
                            <p className="text-xs text-gray-400">{d.specialization}</p>
                          </td>
                          <td className="px-5 py-3 text-center font-semibold text-brand-700">{d.total}</td>
                          <td className="px-5 py-3 text-center text-gray-500">{d.pending}</td>
                          <td className="px-5 py-3 text-center text-green-600 font-medium">{d.completed}</td>
                          <td className="px-5 py-3 text-center text-amber-600">{d.no_show}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
