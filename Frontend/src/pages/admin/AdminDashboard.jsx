import { useState, useEffect } from 'react'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'

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

  useEffect(() => {
    adminApi.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
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
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-semibold text-gray-900">Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

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
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
