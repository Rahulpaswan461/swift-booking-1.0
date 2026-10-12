import { StaffHeader, MetricCard } from '../../components/StaffUI'
import useApiSnapshot from '../../hooks/useApiSnapshot'
import useAppointmentRealtime from '../../hooks/useAppointmentRealtime'
import LiveStatus from '../../components/LiveStatus'
import { useState, useEffect } from 'react'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'
import { clinicUrl } from '../../utils/clinicUrl'

export default function AdminDashboard() {
  const { data, loading, error, refreshing, refresh, updatedAt } = useApiSnapshot(adminApi, '/admin/stats')
  const stats = data?.data
  const liveStatus = useAppointmentRealtime({ role: 'admin', onChange: event => {
    if (event.type !== 'notes_updated') refresh()
  }, onResync: refresh })
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
          setClinic({ id: admin.clinic_id, name: admin.clinicName || 'Your Clinic', slug: admin.clinicSlug })
        }
      })
  }, [])


  const subdomainUrl = clinic?.subdomain_url || (clinic?.slug ? clinicUrl(clinic.slug) : '')

  const copyToClipboard = () => {
    navigator.clipboard.writeText(subdomainUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => setCopied(false))
  }

  return (
    <div className="staff-workspace flex min-h-screen">
      <AdminSidebar />
      <main className="staff-content flex-1 p-4 pt-20 sm:p-6 sm:pt-20 md:p-8">
        <StaffHeader title={clinic?.name || 'Clinic overview'} description={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} eyebrow="At a glance">
          <a href="/admin/billing" className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700">{clinic?.subscription_active ? `${clinic.entitlements?.plan_label || 'Current'} plan` : 'Review your plan'} · Manage</a>
        </StaffHeader>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <LiveStatus status={liveStatus} />
          <span className="text-sm text-gray-500">{refreshing ? 'Updating totals…' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading appointment totals…'}</span>
          <button onClick={refresh} disabled={refreshing} className="ml-auto rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold">Refresh</button>
        </div>
        {(liveStatus === 'expired' || liveStatus === 'forbidden') && <p role="alert" className="mb-4 text-sm text-red-700">Live access needs attention. <a className="underline" href="/admin/billing">Review your plan</a> or <a className="underline" href="/admin/login">sign in again</a>.</p>}
        {error && <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><p>{error} {stats ? 'Displayed totals may be outdated.' : 'Totals could not be loaded.'}</p><button onClick={refresh} disabled={refreshing} className="mt-2 rounded-lg border border-amber-300 px-3 py-2 font-semibold">{refreshing ? 'Retrying…' : 'Retry totals'}</button></div>}
        <section aria-label="Today’s appointment totals" aria-busy={loading} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Total booked', stats?.today.total, 'blue'], ['Confirmed', stats?.today.confirmed, 'amber'], ['Completed', stats?.today.completed, 'green'], ['Cancelled', stats?.today.cancelled, 'rose'], ['No-show', stats?.today.no_show, 'violet'],
          ].map(([label, value, tone]) => <MetricCard key={label} label={label} value={value} tone={tone} sub="Today" />)}
        </section>
        <div className="staff-overview-grid">
          <section className="staff-panel">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2>Today, by doctor</h2><p className="mt-1 text-sm text-gray-500">Appointments and visit outcomes across your team.</p></div><a href="/admin/appointments" className="text-sm font-semibold text-brand-700 underline underline-offset-4">View appointments</a></div>
            {loading ? <p role="status" className="py-12 text-center text-gray-500">Loading your clinic overview…</p> : stats?.doctor_breakdown?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[550px]"><thead><tr>{['Doctor', 'Booked', 'Awaiting visit', 'Completed', 'No-show'].map(label => <th scope="col" key={label} className="px-4 text-left">{label}</th>)}</tr></thead><tbody>{stats.doctor_breakdown.map(d => <tr key={d.doctorId || d.doctorName} className="border-b border-gray-100"><td className="px-4"><p className="font-semibold">{d.doctorName}</p><p className="text-sm text-gray-500">{d.specialization}</p></td><td className="px-4 font-semibold text-blue-700">{d.total}</td><td className="px-4 font-semibold text-amber-800">{d.pending}</td><td className="px-4 font-semibold text-green-700">{d.completed}</td><td className="px-4 font-semibold text-violet-700">{d.no_show}</td></tr>)}</tbody></table></div> : <p className="py-12 text-center text-gray-500">{error ? 'Doctor totals are unavailable. Retry above.' : 'No appointments scheduled for your doctors today.'}</p>}
            <div className="staff-week"><p className="font-semibold">This week</p><div><strong>{stats?.this_week.total ?? '—'}</strong>booked</div><div><strong>{stats?.this_week.completed ?? '—'}</strong>completed</div><div><strong>{stats?.this_week.cancelled ?? '—'}</strong>cancelled</div></div>
          </section>
          <aside className="staff-overview-side space-y-5">
            {subdomainUrl && <section className="staff-panel staff-booking"><h2>Your booking page</h2><p className="my-3 text-sm text-gray-600">Help patients book their next visit. Share your clinic’s link.</p><a href={subdomainUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-800">{subdomainUrl}</a><button onClick={copyToClipboard} className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white">{copied ? 'Copied!' : 'Copy booking link'}</button></section>}
            <section className="staff-panel"><h2 className="mb-5">Your clinic so far</h2><div className="staff-alltime">{[['Appointments', stats?.all_time.total_appointments], ['Active doctors', stats?.all_time.total_doctors], ['Patients', stats?.all_time.total_patients]].map(([label, value]) => <div key={label}><span className="text-sm text-gray-600">{label}</span><strong>{value ?? '—'}</strong></div>)}</div></section>
          </aside>
        </div>
      </main>
    </div>
  )
}
