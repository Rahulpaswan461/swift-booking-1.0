import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'

const SPECIALIZATION_ICONS = {
  'Cardiologist': '🫀',
  'Dermatologist': '🩺',
  'Neurologist': '🧠',
  'Orthopedic': '🦴',
  'Pediatrician': '👶',
  'Psychiatrist': '💭',
  'General Physician': '⚕️',
  'default': '👨‍⚕️'
}

function DoctorCard({ doctor, onBook, animDelay }) {
  const icon = SPECIALIZATION_ICONS[doctor.specialization] || SPECIALIZATION_ICONS.default
  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-brand-200 transition-all duration-200 animate-fade-up opacity-0"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Avatar */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-xl">
          {icon}
        </div>
        {doctor.is_active ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-soft"></span>
            Available
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
            Unavailable
          </span>
        )}
      </div>

      <h3 className="font-display font-semibold text-gray-900 text-lg mb-0.5">
        Dr. {doctor.fullName}
      </h3>
      <p className="text-brand-600 text-sm font-medium mb-1">{doctor.specialization || 'General Physician'}</p>
      <p className="text-gray-400 text-xs mb-4">{doctor.qualification || 'MBBS'}</p>

      <button
        onClick={() => onBook(doctor)}
        disabled={!doctor.is_active}
        className="w-full py-2.5 rounded-xl text-sm font-medium transition-all
          bg-brand-600 hover:bg-brand-700 text-white
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        Book Appointment
      </button>
    </div>
  )
}

export default function DoctorList() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/doctors')
      .then(res => setDoctors(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const specializations = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))]

  const filtered = doctors.filter(d => {
    const matchSearch = d.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                        d.specialization?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || d.specialization === filter
    return matchSearch && matchFilter
  })

  const handleBook = (doctor) => {
    navigate(`/book/${doctor._id}`, { state: { doctor } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <header className="px-8 py-5 flex items-center justify-between">
        <Logo />
        <span className="text-xs text-gray-400 bg-white border border-gray-100 rounded-full px-3 py-1.5">
          {localStorage.getItem('otp_email')}
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <StepIndicator current={2} />

        {/* Hero text */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-display font-semibold text-gray-900 mb-1">
            Choose your doctor
          </h1>
          <p className="text-gray-500">Book an appointment with any of our specialists</p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-up delay-100">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {specializations.map(spec => (
              <button
                key={spec}
                onClick={() => setFilter(spec)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border
                  ${filter === spec
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'}`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Doctor Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded-xl mb-4"/>
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"/>
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"/>
                <div className="h-9 bg-gray-100 rounded-xl"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No doctors found</p>
            <p className="text-sm mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doctor, i) => (
              <DoctorCard key={doctor._id} doctor={doctor} onBook={handleBook} animDelay={i * 80} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
