import { Link } from 'react-router-dom'

export default function Logo({ size = 'md', showClinicName = false }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }
  const clinicInfo = JSON.parse(localStorage.getItem('clinic_info') || 'null')
  const branding = clinicInfo?.branding
  const clinicName = branding?.clinic_name || clinicInfo?.name
  const logoUrl = branding?.logo_url

  // The logo is always a way home — clinic homepage on a clinic
  // subdomain, MediBook homepage on the platform site.
  return (
    <Link to="/" className={`font-display font-semibold ${sizes[size]} text-ink-900 flex items-center gap-2.5 transition hover:opacity-80`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={clinicName || 'Clinic'}
          className="w-9 h-9 rounded-full object-cover shadow-sm border border-brand-100"
        />
      ) : (
        <span className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/20">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </span>
      )}
      {showClinicName && clinicName ? (
        <span className="leading-tight">{clinicName}</span>
      ) : (
        <span>MediBook</span>
      )}
    </Link>
  )
}
