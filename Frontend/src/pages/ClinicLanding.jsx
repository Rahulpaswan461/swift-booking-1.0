import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import Logo from '../components/Logo';
import api from '../api/axios';

function formatTime12h(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const PATIENT_FAQS = [
  {
    q: 'Do I need to create an account?',
    a: 'No. You verify with a one-time code sent to your email or phone, and you can book right away. If you come back later, we recognise you automatically.',
  },
  {
    q: 'What happens after I book?',
    a: 'You get an instant confirmation with your doctor, date, and time — plus a reminder the day before your visit.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes, any time. Your confirmation includes cancel and reschedule links that work with one click — no login needed.',
  },
  {
    q: 'Is my information private?',
    a: 'Yes. Your details stay between you and this clinic, and are only used for your appointments.',
  },
];

function initialsOf(name) {
  return (name || 'D')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Real availability from the doctor's actual weekly schedule
function isAvailableToday(doctor) {
  return doctor.working_days?.includes(DAY_ABBR[new Date().getDay()]) || false;
}

function StepCard({ number, icon, title, desc }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <span className="absolute right-5 top-4 font-display text-5xl font-semibold text-surface-100 select-none">
        {number}
      </span>
      <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function ClinicLanding() {
  const { clinic, clinicName, logoUrl, tagline, loading: clinicLoading } = useClinic();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(true);

  useEffect(() => {
    api
      .get('/doctors')
      .then((res) => setDoctors(res.data.data || res.data || []))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorLoading(false));
  }, []);

  const isVerified = !!localStorage.getItem('token');

  const handleBookNow = () => {
    if (isVerified) {
      navigate('/doctors');
    } else {
      navigate('/verify');
    }
  };

  if (clinicLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  const activeDoctors = doctors.filter((d) => d.is_active);
  const specializations = [...new Set(activeDoctors.map((d) => d.specialization).filter(Boolean))];
  const workingDays = clinic?.operating_hours?.days?.length || 7;
  const badges = clinic?.branding?.badges || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between py-4">
            <Logo size="md" showClinicName />
            <div className="flex items-center gap-2">
              {isVerified && (
                <button
                  onClick={() => navigate('/my-appointments')}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:text-ink-900"
                >
                  My appointments
                </button>
              )}
              <button
                onClick={handleBookNow}
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — two columns like the reference */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-14 pb-16 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Accepting new patients
            </div>
            <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.05] text-ink-900 sm:text-6xl">
              Book your appointment at <span className="text-brand-600">{clinicName}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              {tagline ||
                (specializations.length > 0
                  ? `Verified specialists across ${specializations.slice(0, 3).join(', ').toLowerCase()}${specializations.length > 3 ? ' and more' : ''}. Direct booking, instant confirmation — powered by MediBook.`
                  : 'Choose your doctor, pick a convenient time, and get confirmed instantly. No account needed.')}
            </p>

            {/* Clinic-defined credential badges (set in clinic settings) */}
            {badges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6" stroke="#059669" strokeWidth="1.5" />
                      <path d="M4 7l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleBookNow}
                className="rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Book Appointment
              </button>
              <button
                onClick={() => navigate('/doctors')}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <circle cx="5" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M1 14c0-2.761 2.239-4.5 5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="11" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M15 14c0-2.761-1.791-4.5-4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                View Doctors
              </button>
            </div>

            {/* Stats row */}
            <div className="mt-12 flex max-w-md divide-x divide-gray-100">
              <div className="pr-8">
                <p className="font-display text-3xl font-semibold text-ink-900">{activeDoctors.length || '—'}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Doctors</p>
              </div>
              <div className="px-8">
                <p className="font-display text-3xl font-semibold text-ink-900">{workingDays}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Days / Week</p>
              </div>
              <div className="pl-8">
                <p className="font-display text-3xl font-semibold text-ink-900">24h</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Confirmation</p>
              </div>
            </div>
          </div>

          {/* Right: branded visual panel */}
          <div className="relative hidden lg:block animate-fade-up delay-100">
            <div className="relative aspect-[4/3.4] rounded-[32px] bg-gradient-to-br from-brand-50 via-white to-brand-100 border border-brand-100 shadow-xl shadow-brand-900/5 overflow-hidden">
              {/* Center emblem */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-lg shadow-brand-900/10">
                  {logoUrl ? (
                    <img src={logoUrl} alt={clinicName} className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <span className="font-display text-5xl font-semibold text-brand-600">
                      {initialsOf(clinicName)}
                    </span>
                  )}
                </div>
              </div>

              {/* Floating trust chip — clinic's own first badge when set */}
              <div className="absolute right-5 top-5 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-brand-900/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#059669" strokeWidth="1.5" />
                    <path d="M4 7l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-bold text-ink-900">{badges[0] || 'OTP-verified booking'}</span>
                  <span className="block text-[11px] text-gray-400">{badges[0] ? 'Clinic credential' : 'Secure & private'}</span>
                </span>
              </div>

              {/* Bottom booking mini-card */}
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-lg shadow-brand-900/10">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Book in under 2 minutes</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-900">No account or password needed</p>
                </div>
                <button
                  onClick={handleBookNow}
                  className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700"
                >
                  Book
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Doctors — "Available specialists" */}
      <section className="border-t border-surface-100 bg-surface-50/60">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">Available specialists</h2>
              <p className="mt-2 text-gray-500">Qualified doctors ready to assist you.</p>
            </div>
            <button
              onClick={() => navigate('/doctors')}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
            >
              View all doctors
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {doctorLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-[24px] border border-surface-100 bg-white p-6 animate-pulse">
                  <div className="mb-4 h-14 w-14 rounded-2xl bg-gray-100" />
                  <div className="mb-3 h-5 w-3/4 rounded-lg bg-gray-100" />
                  <div className="h-4 w-1/2 rounded-lg bg-gray-50" />
                </div>
              ))}
            </div>
          ) : activeDoctors.length === 0 ? (
            <div className="rounded-[24px] border border-surface-100 bg-white py-16 text-center text-gray-500">
              <p className="font-medium">No doctors available at the moment</p>
              <p className="mt-1 text-sm">Please check back later</p>
            </div>
          ) : (
            /* One consistent rich card design at every count — width capped
               so 1 or 2 cards keep a natural, professional size */
            <div className={`grid grid-cols-1 gap-5
              ${activeDoctors.length === 1
                ? 'max-w-md'
                : activeDoctors.length === 2
                  ? 'sm:grid-cols-2 lg:max-w-4xl'
                  : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {activeDoctors.slice(0, 6).map((doctor, i) => (
                <div
                  key={doctor.id}
                  className="group flex flex-col rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5 animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 font-display text-lg font-semibold text-brand-700">
                      {initialsOf(doctor.full_name)}
                    </div>
                    {isAvailableToday(doctor) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        Available today
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-ink-900">Dr. {doctor.full_name}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-brand-600">{doctor.specialization}</p>
                  <p className="mt-1 flex items-center justify-between text-xs text-gray-400">
                    <span>{doctor.qualification || 'MBBS'}</span>
                    {doctor.consultation_fee != null && (
                      <span className="font-bold text-gray-600">₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}</span>
                    )}
                  </p>

                  {/* Real schedule details keep every card equally substantial */}
                  {(doctor.working_days?.length > 0 || doctor.consult_hours?.start) && (
                    <div className="mt-4 space-y-1.5 border-t border-gray-50 pt-3.5 text-xs text-gray-500">
                      {doctor.working_days?.length > 0 && (
                        <p className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 2v2M11 2v2M2 7h12" strokeLinecap="round"/>
                          </svg>
                          Consults {doctor.working_days.join(', ')}
                        </p>
                      )}
                      {doctor.consult_hours?.start && (
                        <p className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2" strokeLinecap="round"/>
                          </svg>
                          {formatTime12h(doctor.consult_hours.start)} – {formatTime12h(doctor.consult_hours.end)}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleBookNow}
                    className="mt-auto pt-5 w-full"
                  >
                    <span className="block w-full rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition group-hover:bg-brand-700">
                      Book appointment
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why book online — true platform benefits */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid gap-6 rounded-[28px] border border-surface-100 bg-white p-8 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-10">
          {[
            {
              icon: <><circle cx="9" cy="9" r="7" stroke="#1d7f72" strokeWidth="1.5"/><path d="M6 9l2 2 4-4" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
              title: 'Instant confirmation',
              desc: 'Your slot is locked in the moment you book.',
            },
            {
              icon: <><path d="M9 2a5 5 0 015 5c0 4 2 5 2 5H2s2-1 2-5a5 5 0 015-5z" stroke="#1d7f72" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7.5 15a1.7 1.7 0 003 0" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round"/></>,
              title: 'Reminded before your visit',
              desc: 'A reminder arrives the day before, automatically.',
            },
            {
              icon: <><path d="M3 9a6 6 0 016-6c2.5 0 4.6 1.5 5.5 3.5M15 9a6 6 0 01-6 6c-2.5 0-4.6-1.5-5.5-3.5" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 3v3.5h-3.5M4 15v-3.5h3.5" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
              title: 'Change plans easily',
              desc: 'Cancel or reschedule in one click — no phone call.',
            },
            {
              icon: <><circle cx="9" cy="6.5" r="3" stroke="#1d7f72" strokeWidth="1.5"/><path d="M3 15.5c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round"/></>,
              title: 'No account needed',
              desc: 'Verify with a quick code and book — that’s it.',
            },
          ].map((b) => (
            <div key={b.title} className="flex gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{b.icon}</svg>
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink-900">{b.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">How it works</p>
        <h2 className="mb-10 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">
          Care in three simple steps
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StepCard
            number="01"
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l5 2v4c0 3.5-2.5 6-5 7-2.5-1-5-3.5-5-7V3l5-2z" stroke="#1d7f72" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M5.5 8l1.8 1.8L10.5 6.5" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Verify who you are"
            desc="Just your email or phone number — we send a quick code. No sign-up, no password to remember."
          />
          <StepCard
            number="02"
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#1d7f72" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="Find the right doctor"
            desc="Browse our doctors by specialization and choose the one you feel most comfortable with."
          />
          <StepCard
            number="03"
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="#1d7f72" strokeWidth="1.5" />
                <path d="M5 2v2M11 2v2M2 7h12" stroke="#1d7f72" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="Pick a time that works"
            desc="Choose a date and time that fits your schedule — your confirmation arrives right away."
          />
        </div>
      </section>

      {/* Visit us — real hours & address only */}
      {(clinic?.operating_hours?.days?.length > 0 || clinic?.address) && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8 py-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {clinic?.operating_hours?.days?.length > 0 && (
              <div className="flex items-start gap-4 rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
                  <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#1d7f72" strokeWidth="1.5">
                    <circle cx="9" cy="9" r="7"/><path d="M9 5.5V9l2.5 2" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-ink-900">Clinic hours</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {clinic.operating_hours.days.join(', ')}
                  </p>
                  {clinic.operating_hours.open && (
                    <p className="text-sm font-semibold text-brand-700">
                      {formatTime12h(clinic.operating_hours.open)} – {formatTime12h(clinic.operating_hours.close)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {clinic?.address && (
              <div className="flex items-start gap-4 rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
                  <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#1d7f72" strokeWidth="1.5">
                    <path d="M9 1.5C6 1.5 3.5 4 3.5 7c0 4 5.5 9.5 5.5 9.5S14.5 11 14.5 7c0-3-2.5-5.5-5.5-5.5z"/>
                    <circle cx="9" cy="7" r="2"/>
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-ink-900">Find us</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{clinic.address}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Patient FAQ — all answers visible: patients shouldn't have to
          click around to be reassured */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">Good to know</h2>
          <p className="mb-9 text-center text-gray-500">Quick answers before you book.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {PATIENT_FAQS.map((item) => (
              <div key={item.q} className="rounded-[24px] border border-surface-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-brand-100 bg-brand-50">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold text-ink-900">{item.q}</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
        <div className="rounded-[28px] bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-center shadow-2xl shadow-brand-600/20 sm:p-12">
          <h2 className="mb-3 font-display text-2xl font-semibold text-white sm:text-3xl">
            Ready to book your appointment?
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-brand-100">
            It takes less than 2 minutes. No account required — just verify with your email or phone.
          </p>
          <button
            onClick={handleBookNow}
            className="rounded-full bg-white px-8 py-4 text-base font-bold text-brand-700 shadow-xl transition hover:bg-brand-50"
          >
            Book Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-gray-400">
              Powered by MediBook — Appointment Management Platform
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs uppercase tracking-wider text-gray-300">Staff access</span>
              <button
                onClick={() => navigate('/doctor/login')}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Doctor login
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Clinic admin
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
