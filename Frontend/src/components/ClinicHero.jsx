import { useState } from 'react'

export default function ClinicHero({ clinicName, logoUrl, tagline, badges = [], doctorCount, onBook, preview = false }) {
  const [failedLogo, setFailedLogo] = useState('')
  const Heading = preview ? 'h3' : 'h1'
  const initials = (clinicName || 'Clinic').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
  const action = className => preview ? <span className={className}>Book an appointment <span aria-hidden="true">↗</span></span> : <button type="button" className={className} onClick={onBook}>Book an appointment <span aria-hidden="true">↗</span></button>
  return <section className={`clinic-hero ${preview ? 'clinic-hero-preview' : ''}`}>
    <div className="clinic-hero-layout">
      <div className="clinic-hero-copy">
        <p className="clinic-eyebrow">Your clinic. Your care.</p>
        <Heading>Book your next visit at <span>{clinicName}</span>.</Heading>
        <p className="clinic-hero-description">{tagline || 'Choose your doctor, find a convenient time, and book your visit in a few simple steps.'}</p>
        <div className="clinic-hero-actions">{action('clinic-primary')}{!preview && <a href="#doctors" className="clinic-text-link">Meet our doctors <span aria-hidden="true">↓</span></a>}</div>
        <p className="clinic-hero-note">Verify by email · No password needed</p>
        {badges.length > 0 && <div className="clinic-credentials">{badges.slice(0, 4).map((badge,i) => <span key={`${badge}-${i}`}>{badge}</span>)}</div>}
        {doctorCount > 0 && <p className="clinic-team-note"><strong>{doctorCount} doctor{doctorCount === 1 ? '' : 's'}</strong> · View schedules and consultation fees below</p>}
      </div>
      <div className="clinic-visual" aria-label="Your clinic booking page">
        <div className="clinic-visual-orbit" aria-hidden="true" />
        <div className="clinic-visual-label"><span className="clinic-check" aria-hidden="true">✓</span><div><strong>Email-verified booking</strong><span>A simple start to your visit</span></div></div>
        <div className="clinic-emblem">{logoUrl && failedLogo !== logoUrl ? <img src={logoUrl} alt={clinicName} onError={() => setFailedLogo(logoUrl)} /> : <span>{initials}</span>}</div>
        <div className="clinic-visual-footer"><div><p>Plan your next visit</p><strong>Choose a doctor. Find your time.</strong></div>{preview ? <span className="clinic-visual-arrow" aria-hidden="true">↗</span> : <button type="button" className="clinic-visual-arrow" aria-label="Start booking an appointment" onClick={onBook}>↗</button>}</div>
      </div>
    </div>
  </section>
}
