import ClinicHero from '../components/ClinicHero';
import ClinicVisitGuide from '../components/ClinicVisitGuide';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import api from '../api/axios';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4';
const primary = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 ${focus}`;
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const doctorName = name => /^dr\.?\s/i.test(name || '') ? name : `Dr. ${name || 'Doctor'}`;
const initials = name => (name || 'Clinic').replace(/^dr\.?\s/i, '').trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
function timeLabel(value) {
  if (!value || !/^\d{1,2}:\d{2}/.test(value)) return '';
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>;
}
export default function ClinicLanding() {
  const { clinic, clinicName, logoUrl, tagline } = useClinic();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [specialty, setSpecialty] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    api.get('/doctors', { signal: controller.signal, timeout: 90_000 })
      .then(response => {
        const records = response.data.data || response.data;
        if (!Array.isArray(records)) throw new Error('Invalid doctor list');
        if (active) setDoctors(records.filter(doctor => doctor.is_active));
      })
      .catch(err => { if (active && err.code !== 'ERR_CANCELED') setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [clinic?.id, attempt]);

  const isVerified = !!localStorage.getItem('token') && localStorage.getItem('patient_clinic') === String(clinic?.id);
  const book = doctorId => {
    const doctor = doctors.find(item => item.id === doctorId);
    navigate(isVerified ? (doctor ? `/book/${doctorId}` : '/doctors') : '/verify', { state: doctor ? { doctor } : null });
  };
  const specialties = [...new Map(doctors.filter(d => d.specialization).map(d => [d.specialization.trim().toLowerCase(), d.specialization.trim()])).values()];
  const filteredDoctors = doctors.filter(doctor => !specialty || doctor.specialization?.trim().toLowerCase() === specialty.toLowerCase());
  const hours = clinic?.operating_hours;
  const opening = timeLabel(hours?.open);
  const closing = timeLabel(hours?.close);
  const workingDays = Array.isArray(hours?.days) ? hours.days : [];
  const badges = Array.isArray(clinic?.branding?.badges) ? clinic.branding.badges.filter(badge => typeof badge === 'string' && badge.trim()) : [];

  return (
    <div className="clinic-home min-h-screen bg-white text-ink-900">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link to="/" className={`flex min-w-0 max-w-full items-center gap-3 rounded-lg ${focus}`}>
            {logoUrl ? <img src={logoUrl} alt="" width="40" height="40" className="h-10 w-10 shrink-0 rounded-xl border border-brand-100 object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{initials(clinicName)}</span>}
            <span className="min-w-0 break-words font-display text-lg font-semibold leading-tight sm:text-xl">{clinicName}<span className="mt-1 block font-sans text-[10px] font-medium uppercase tracking-widest text-gray-500">Patient booking</span></span>
          </Link>
          <nav aria-label="Clinic navigation" className="flex flex-wrap items-center gap-3 text-sm">
            <a href="#doctors" className={`hidden rounded font-medium text-gray-600 hover:text-brand-700 sm:block ${focus}`}>Our doctors</a>
            <a href="#plan-your-visit" className={`hidden rounded font-medium text-gray-600 hover:text-brand-700 lg:block ${focus}`}>Plan your visit</a>
            {isVerified && <button type="button" onClick={() => navigate('/my-appointments')} className={`rounded text-xs font-medium text-gray-600 ${focus}`}>My appointments</button>}
            <button type="button" onClick={() => book()} className={primary}>Book a visit <Icon name="arrow" className="h-4 w-4" /></button>
          </nav>
        </div>
      </header>
      <main>
        <ClinicHero clinicName={clinicName} logoUrl={logoUrl} tagline={tagline} badges={badges} doctorCount={loading || error ? null : doctors.length} onBook={() => book()} />
        {(clinic?.address || workingDays.length > 0 || (opening && closing)) && <section className="clinic-visit-strip" aria-label="Visit information">
          {clinic?.address && <div><Icon name="location" className="h-5 w-5 shrink-0 text-brand-600" /><div><strong>Find us</strong><p>{clinic.address}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinicName} ${clinic.address}`)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 underline underline-offset-4">Get directions</a></div></div>}
          {(workingDays.length > 0 || (opening && closing)) && <div><Icon name="clock" className="h-5 w-5 shrink-0 text-brand-600" /><div><strong>Clinic hours</strong><p>{workingDays.join(', ')}{opening && closing ? ` · ${opening}–${closing}` : ''}</p><p className="text-xs text-gray-500">Individual doctor schedules may vary.</p></div></div>}
        </section>}

        <section id="doctors" className="mx-auto max-w-7xl scroll-mt-36 px-5 py-14 sm:px-8 sm:py-16" aria-labelledby="doctor-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Our team</p><h2 id="doctor-heading" className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Meet our doctors</h2><p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">Find the right doctor for your visit. Choose a doctor to see available appointment times.</p></div>{!loading && !error && doctors.length > 0 && <p className="text-xs text-gray-500">{doctors.length} doctor{doctors.length === 1 ? '' : 's'} listed</p>}</div>
          {!loading && !error && specialties.length > 1 && <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter doctors by specialty">{['', ...specialties].map(value => <button key={value} type="button" aria-pressed={specialty === value} onClick={() => { setSpecialty(value); setVisibleCount(6); }} className={`rounded-full border px-4 py-2 text-xs font-medium ${focus} ${specialty === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300'}`}>{value || 'All doctors'}</button>)}</div>}
          <div className="mt-7" aria-busy={loading}>
            {loading ? <div role="status"><span className="sr-only">Loading doctors</span><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">{[1, 2, 3].map(item => <div key={item} className="h-72 animate-pulse rounded-2xl border border-gray-100 bg-surface-50 p-6"><div className="mb-5 h-12 w-12 rounded-xl bg-gray-200" /><div className="mb-3 h-4 w-2/3 rounded bg-gray-200" /><div className="h-3 w-1/2 rounded bg-gray-200" /></div>)}</div></div>
              : error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><h3 className="font-semibold">We couldn’t load the doctors.</h3><p className="mt-2 text-sm text-gray-600">Please try again to see the latest doctor details and continue booking.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className={`${primary} mt-5`}>Try again</button></div>
              : filteredDoctors.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-surface-50 px-6 py-12 text-center"><h3 className="font-semibold">No doctors are listed yet</h3><p className="mt-2 text-sm leading-6 text-gray-500">Please check back later or contact the clinic for appointment information.</p></div>
              : <><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredDoctors.slice(0, visibleCount).map(doctor => {
                const consultingDays = Array.isArray(doctor.working_days) ? doctor.working_days : [];
                const start = timeLabel(doctor.consult_hours?.start);
                const end = timeLabel(doctor.consult_hours?.end);
                const hasFee = doctor.consultation_fee != null && doctor.consultation_fee !== '' && Number.isFinite(Number(doctor.consultation_fee));
                return <article key={doctor.id} className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 font-display text-lg font-semibold text-brand-800">{initials(doctor.full_name)}</span>{consultingDays.includes(days[new Date().getDay()]) && <span className="rounded-full bg-surface-100 px-3 py-1 text-[11px] font-medium text-gray-600">Consults on {days[new Date().getDay()]}</span>}</div>
                  <h3 className="break-words font-display text-xl font-semibold">{doctorName(doctor.full_name)}</h3>{doctor.specialization && <p className="mt-1 text-sm font-medium text-brand-700">{doctor.specialization}</p>}{doctor.qualification && <p className="mt-2 text-xs leading-5 text-gray-500">{doctor.qualification}</p>}
                  <div className="mb-5 mt-5 space-y-3 border-t border-gray-100 pt-4 text-xs leading-5 text-gray-600">{consultingDays.length > 0 && <p className="flex gap-2"><Icon name="calendar" className="h-4 w-4 shrink-0 text-gray-400" /><span>{consultingDays.join(', ')}</span></p>}{start && end && <p className="flex gap-2"><Icon name="clock" className="h-4 w-4 shrink-0 text-gray-400" />{start} – {end}</p>}<div className="flex flex-wrap items-center justify-between gap-2"><span>Consultation fee</span><span className={hasFee ? 'text-sm font-semibold text-ink-900' : 'text-gray-500'}>{hasFee ? `₹${Number(doctor.consultation_fee).toLocaleString('en-IN')}` : 'Ask the clinic'}</span></div></div>
                  <button type="button" onClick={() => book(doctor.id)} className={`${primary} mt-auto w-full`}>Choose this doctor<Icon name="arrow" className="h-4 w-4" /></button>
                </article>;
              })}</div>{filteredDoctors.length > visibleCount && <button type="button" onClick={() => setVisibleCount(value => value + 6)} className={`mx-auto mt-6 block rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-brand-700 ${focus}`}>Show more doctors</button>}</>}
          </div>
        </section>

        <ClinicVisitGuide clinic={clinic || {}} clinicName={clinicName} onBook={() => book()} />
      </main>
      <footer className="border-t border-gray-100"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7 sm:px-8"><div><p className="text-sm font-semibold">{clinicName}</p><p className="mt-1 text-xs text-gray-500">Online appointment booking powered by Healibrate</p></div><div className="flex gap-5 text-xs text-gray-500"><Link to="/doctor/login" className={`rounded hover:text-brand-700 ${focus}`}>Doctor sign in</Link><Link to="/admin/login" className={`rounded hover:text-brand-700 ${focus}`}>Clinic sign in</Link></div></div></footer>
    </div>
  );
}
