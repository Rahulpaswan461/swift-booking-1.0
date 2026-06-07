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
      className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-brand-300 transition-all duration-300 animate-fade-up opacity-0 flex flex-col h-full"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Header with avatar and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-2xl shadow-md">
          {icon}
        </div>
        {doctor.is_active ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Available
          </span>
        ) : (
          <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
            Unavailable
          </span>
        )}
      </div>

      {/* Doctor info */}
      <h3 className="font-display font-bold text-gray-900 text-lg mb-1">
        Dr. {doctor.full_name || doctor.fullName}
      </h3>
      
      <p className="text-brand-600 text-sm font-semibold mb-1">{doctor.specialization || 'General Physician'}</p>
      
      <p className="text-gray-500 text-xs mb-4 flex-grow">{doctor.qualification || 'MBBS'}</p>

      {/* Divider */}
      <div className="border-t border-gray-100 my-3" />

      {/* Badge section */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {doctor.experience && (
          <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
            {doctor.experience} years exp.
          </span>
        )}
        {doctor.rating && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
            ⭐ {doctor.rating}
          </span>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onBook(doctor)}
        disabled={!doctor.is_active}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all bg-brand-600 hover:bg-brand-700 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20 hover:shadow-xl hover:shadow-brand-600/30 disabled:shadow-none"
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
    const matchSearch = (d.full_name || d.fullName)?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || d.specialization === filter
    return matchSearch && matchFilter
  })

  const handleBook = (doctor) => {
    navigate(`/book/${doctor.id || doctor._id}`, { state: { doctor } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <Logo />
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-4 py-2 transition hover:bg-gray-50 flex items-center gap-2 font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 hidden sm:inline-block">
            {localStorage.getItem('otp_email')}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <StepIndicator current={2} />

        {/* Hero Section */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
            Choose your specialist
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Browse our verified doctors, check their availability, and book an appointment in seconds
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-up delay-100">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by doctor name or specialty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition hover:border-gray-300"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-8 flex-wrap animate-fade-up delay-150">
          {specializations.map(spec => (
            <button
              key={spec}
              onClick={() => setFilter(spec)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2
                ${filter === spec
                  ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-600/20'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Doctor Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl mb-4" />
                <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded-lg w-1/2 mb-4" />
                <div className="h-10 bg-gray-100 rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-6xl mb-4">🔍</div>
            <p className="font-bold text-lg mb-2">No doctors found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doctor, i) => (
              <DoctorCard key={doctor.id || doctor._id} doctor={doctor} onBook={handleBook} animDelay={i * 80} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
