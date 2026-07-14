import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import SupportModal from './SupportModal'

export function DoctorSidebar() {
  const navigate = useNavigate()
  const doctor   = JSON.parse(localStorage.getItem('doctor') || '{}')

  const logout = () => {
    localStorage.removeItem('doctor_token')
    localStorage.removeItem('doctor')
    navigate('/doctor/login')
  }

  const links = [
    { to: '/doctor/dashboard', label: 'Appointments', icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-white bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-surface-100 px-6 py-6">
        <Logo size="sm" />
        <p className="text-xs text-gray-500 font-semibold mt-3 uppercase tracking-wider">Doctor Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
              ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-surface-100 bg-surface-50 px-4 py-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-surface-100 bg-white p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {doctor.fullName?.[0] || 'D'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Dr. {doctor.fullName || 'Doctor'}</p>
            <p className="text-xs text-gray-500 truncate">{doctor.specialization || 'Specialist'}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 transition border border-red-100 hover:border-red-200">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}

export function AdminSidebar() {
  const navigate = useNavigate()
  const admin    = JSON.parse(localStorage.getItem('admin') || '{}')
  const [showSupport, setShowSupport] = useState(false)

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin')
    navigate('/admin/login')
  }

  const links = [
    { to: '/admin/dashboard', label: 'Overview', icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { to: '/admin/appointments', label: 'Appointments', icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { to: '/admin/doctors/create', label: 'Doctors', icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { to: '/admin/branding', label: 'Branding', icon: (
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 2c-1.5 2-2 4-2 7s.5 5 2 7c1.5-2 2-4 2-7s-.5-5-2-7z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 9h14" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
  ]

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-white bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-surface-100 px-6 py-6">
        <Logo size="sm" />
        <p className="mt-3 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
              ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Help & Support */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowSupport(true)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-surface-100 hover:text-gray-900"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 7a2 2 0 113.4 1.4c-.6.6-1.4.9-1.4 1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
          </svg>
          Help & Support
        </button>
      </div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      {/* User Profile */}
      <div className="border-t border-surface-100 bg-surface-50 px-4 py-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-surface-100 bg-white p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {admin.fullName?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{admin.fullName || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{admin.email || 'admin@clinic.com'}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-50 transition border border-red-100 hover:border-red-200">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
