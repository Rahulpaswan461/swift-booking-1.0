import { useState, useEffect } from 'react'
import api from '../../api/axios'

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-green-200 bg-green-50' : 'border-surface-100 bg-white'}`}>
      <p className={`text-3xl font-bold ${highlight ? 'text-green-700' : 'text-ink-900'}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  )
}

/**
 * Founder-only dashboard — gated by INTERNAL_METRICS_KEY, not clinic auth.
 * Answers one question: which clinics are ready to pay?
 */
export default function PlatformMetrics() {
  const [key, setKey] = useState(() => sessionStorage.getItem('metrics_key') || '')
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = (k) => {
    setLoading(true)
    setError('')
    api.get('/platform/metrics', { headers: { 'x-internal-key': k } })
      .then(res => {
        setData(res.data.data)
        sessionStorage.setItem('metrics_key', k)
        setKey(k)
      })
      .catch(err => {
        setError(err.response?.status === 401 ? 'Wrong key.' : 'Failed to load metrics — is INTERNAL_METRICS_KEY set on the backend?')
        sessionStorage.removeItem('metrics_key')
        setKey('')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (key) load(key) }, [])

  if (!key || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
        <div className="w-full max-w-sm rounded-[24px] border border-surface-100 bg-white p-8 shadow-sm">
          <h1 className="mb-1 font-display text-xl font-semibold text-ink-900">Platform metrics</h1>
          <p className="mb-5 text-xs text-gray-400">Founder access — enter your internal key.</p>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && input && load(input)}
            placeholder="INTERNAL_METRICS_KEY"
            className="mb-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
          <button
            onClick={() => input && load(input)}
            disabled={loading || !input}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'View metrics'}
          </button>
        </div>
      </div>
    )
  }

  const t = data.totals

  return (
    <div className="min-h-screen bg-surface-50 p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900">Platform metrics</h1>
            <p className="mt-1 text-sm text-gray-400">Generated {new Date(data.generated_at).toLocaleString()} · Early Access</p>
          </div>
          <button onClick={() => load(key)} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100">
            Refresh
          </button>
        </div>

        {/* Totals */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Clinics" value={t.clinics} />
          <Stat label="New (7d)" value={t.new_clinics_7d} />
          <Stat label="Active (7d)" value={t.active_clinics_7d} />
          <Stat label="Bookings 7d" value={t.bookings_7d} />
          <Stat label="Bookings 30d" value={t.bookings_30d} />
          <Stat label="Upgrade-ready" value={t.upgrade_ready_clinics} highlight />
        </div>

        {/* Per-clinic table */}
        <div className="overflow-hidden rounded-[24px] border border-surface-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-ink-900">Clinics by activity</h2>
            <p className="text-xs text-gray-400">"Upgrade-ready" = exceeds the future free tier (&gt;1 doctor or &gt;50 bookings/30d) — your first paying customers.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3 font-semibold">Clinic</th>
                  <th className="px-3 py-3 text-center font-semibold">Doctors</th>
                  <th className="px-3 py-3 text-center font-semibold">Bookings 30d</th>
                  <th className="px-3 py-3 text-center font-semibold">7d</th>
                  <th className="px-3 py-3 text-center font-semibold">Total</th>
                  <th className="px-3 py-3 text-center font-semibold">Branded</th>
                  <th className="px-3 py-3 text-center font-semibold">Last booking</th>
                  <th className="px-6 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.clinics.map(c => (
                  <tr key={c.id} className="hover:bg-surface-50/60">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-ink-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.slug} · joined {new Date(c.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold">{c.doctors}</td>
                    <td className="px-3 py-3.5 text-center font-semibold">{c.bookings_30d}</td>
                    <td className="px-3 py-3.5 text-center text-gray-500">{c.bookings_7d}</td>
                    <td className="px-3 py-3.5 text-center text-gray-500">{c.bookings_total}</td>
                    <td className="px-3 py-3.5 text-center">{c.branding_customized ? '✓' : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-3.5 text-center text-xs text-gray-400">
                      {c.last_booking_at ? new Date(c.last_booking_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {c.upgrade_ready ? (
                        <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[11px] font-bold text-green-700">UPGRADE-READY</span>
                      ) : c.bookings_7d > 0 ? (
                        <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-600">ACTIVE</span>
                      ) : (
                        <span className="rounded-full bg-gray-50 border border-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-400">QUIET</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
