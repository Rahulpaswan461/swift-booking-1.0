import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'
import { useClinic } from '../context/ClinicContext'

function initialsOf(name) {
  return (name || 'D')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Real availability from the doctor's actual weekly schedule — no
// fabricated times. Returns null when no schedule has been set yet.
function availabilityOf(doctor) {
  if (!doctor.working_days?.length) return null
  const today = DAY_ABBR[new Date().getDay()]
  if (doctor.working_days.includes(today)) return { today: true, label: 'Available today' }
  return { today: false, label: `Consults ${doctor.working_days.join(', ')}` }
}

function DoctorRow({ doctor, clinicName, onBook, animDelay }) {
  const availability = availabilityOf(doctor)

  return (
    <div
      className="rounded-[24px] border border-surface-100 bg-white p-5 sm:p-6 shadow-sm transition-all hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5 animate-fade-up opacity-0"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 font-display text-xl font-semibold text-brand-700">
          {initialsOf(doctor.full_name || doctor.fullName)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-ink-900">
              Dr. {doctor.full_name || doctor.fullName}
            </h3>
            {availability?.today && doctor.is_active && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Available today
              </span>
            )}
            {!doctor.is_active && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Unavailable
              </span>
            )}
            {doctor.consultation_fee != null && (
              <span className="ml-auto rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                Fees: ₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-brand-600">
            {doctor.specialization || 'General Physician'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1C3.8 1 2 2.8 2 5c0 2.8 4 6 4 6s4-3.2 4-6c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="6" cy="5" r="1.4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {doctor.qualification || 'MBBS'} · {clinicName}
          </p>
          {availability && !availability.today && (
            <p className="mt-1 text-xs font-medium text-gray-500">{availability.label}</p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onBook(doctor)}
          disabled={!doctor.is_active}
          className="flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
        >
          {doctor.is_active ? 'Select & pick a time' : 'Currently unavailable'}
          {doctor.is_active && (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default function DoctorList() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const navigate = useNavigate()
  const { clinicName } = useClinic()

  const contact = localStorage.getItem('otp_contact') || ''

  useEffect(() => {
    api.get('/doctors')
      .then(res => setDoctors(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const specializations = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))]

  const filtered = doctors.filter(d => {
    const matchSearch = (d.full_name || d.fullName)?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || d.specialization === filter
    return matchSearch && matchFilter
  })

  const handleBook = (doctor) => {
    navigate(`/book/${doctor.id || doctor._id}`, { state: { doctor } })
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 px-6 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo showClinicName />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/my-appointments')}
              className="hidden px-4 py-2 text-sm font-medium text-gray-600 transition hover:text-ink-900 sm:block"
            >
              My appointments
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100 hover:text-gray-900"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        {/* Centered progress */}
        <div className="mb-10 flex justify-center">
          <StepIndicator current={2} />
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div>
            <div className="mb-6 animate-fade-up">
              <h1 className="mb-2 font-display text-4xl font-semibold text-ink-900">
                Choose your doctor
              </h1>
              <p className="text-gray-600">
                You're verified — pick a doctor below, then choose a time that suits you.
              </p>
            </div>

            {/* Search */}
            <div className="relative mb-4 animate-fade-up delay-100">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by doctor name or specialty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm transition hover:border-brand-200 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Filter chips */}
            <div className="mb-6 flex flex-wrap gap-2 animate-fade-up delay-150">
              {specializations.map(spec => (
                <button
                  key={spec}
                  onClick={() => setFilter(spec)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all
                    ${filter === spec
                      ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50'}`}
                >
                  {spec}
                </button>
              ))}
            </div>

            {/* Doctor list */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-[24px] border border-surface-100 bg-white p-6 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-1/3 rounded-lg bg-gray-100" />
                        <div className="h-4 w-1/4 rounded-lg bg-gray-50" />
                      </div>
                      <div className="h-11 w-44 rounded-full bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[24px] border border-surface-100 bg-white py-20 text-center text-gray-500">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-brand-700">
                  <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="mb-2 text-lg font-bold">No doctors found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((doctor, i) => (
                  <DoctorRow
                    key={doctor.id || doctor._id}
                    doctor={doctor}
                    clinicName={clinicName}
                    onBook={handleBook}
                    animDelay={i * 70}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            {/* Booking summary */}
            <div className="rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm animate-fade-up delay-100">
              <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-ink-900">
                Booking summary
              </p>
              <dl className="divide-y divide-gray-50">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-gray-500">Patient</dt>
                  <dd className="max-w-[55%] truncate text-sm font-semibold text-ink-900">{contact || 'Verified'}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-gray-500">Clinic</dt>
                  <dd className="text-sm font-semibold text-ink-900">{clinicName}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-gray-500">Service</dt>
                  <dd className="text-sm font-semibold text-ink-900">Consultation</dd>
                </div>
              </dl>
              <div className="mt-3 rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3">
                <p className="text-xs leading-relaxed text-brand-800">
                  Select a doctor to see their available time slots.
                </p>
              </div>
            </div>

            {/* Trust card */}
            <div className="rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm animate-fade-up delay-150">
              <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-ink-900">
                Why patients trust us
              </p>
              <ul className="space-y-3">
                {[
                  'OTP-verified, secure booking',
                  'Instant confirmation by email or SMS',
                  'Free cancellation & reschedule links',
                  'Your records stay with this clinic',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
