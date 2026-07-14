import { useNavigate, useLocation } from 'react-router-dom'
import Logo from './Logo'

const LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

/**
 * One shared header for every MediBook platform page (home, pricing,
 * about, contact) — same links everywhere, current page highlighted,
 * logo always returns home.
 */
export default function PlatformHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={`hidden rounded-full px-4 py-2 text-sm font-medium transition sm:block
                ${pathname === link.to
                  ? 'bg-surface-100 text-ink-900'
                  : 'text-gray-600 hover:bg-surface-100 hover:text-ink-900'}`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => navigate('/admin/login')}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100 hover:text-ink-900"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/admin/register')}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            Start Free
          </button>
        </nav>
      </div>
    </header>
  )
}
