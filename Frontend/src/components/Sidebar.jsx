import { NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'

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
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-white">
        <Logo size="sm" />
        <p className="text-xs text-gray-500 font-semibold mt-3 uppercase tracking-wider">Doctor Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
              ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-5 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
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
  ]

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <Logo size="sm" />
        <p className="text-xs text-slate-600 font-bold bg-slate-100 rounded-full px-2.5 py-1 mt-3 inline-block uppercase tracking-wider">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all
              ${isActive ? 'bg-slate-700 text-white shadow-lg shadow-slate-700/30' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-5 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
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
