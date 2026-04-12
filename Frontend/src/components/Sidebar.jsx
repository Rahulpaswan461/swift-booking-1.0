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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
            {doctor.fullName?.[0] || 'D'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">Dr. {doctor.fullName || 'Doctor'}</p>
            <p className="text-xs text-gray-400 truncate">{doctor.specialization || ''}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs text-gray-400 hover:text-red-500 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 transition">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )},
    { to: '/admin/appointments', label: 'Appointments', icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
    { to: '/admin/doctors/create', label: 'Doctors', icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )},
  ]

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <Logo size="sm" />
        <span className="text-xs text-brand-600 font-medium bg-brand-50 rounded-full px-2 py-0.5 mt-1 inline-block">Admin Panel</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(link => (
          <NavLink key={link.to} to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`
            }>
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
            {admin.fullName?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{admin.fullName || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">{admin.email || ''}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs text-gray-400 hover:text-red-500 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-50 transition">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
