import { useNavigate } from 'react-router-dom'
import PlatformHeader from '../components/PlatformHeader'

// Editorial, prose-first page — deliberately quieter than the home page.
// The home page sells; this page explains who we are.

const PRINCIPLES = [
  {
    title: 'Patients first',
    desc: 'No apps to download, no accounts to create, no passwords to forget. Your patients book in under a minute — and get every confirmation and reminder automatically.',
  },
  {
    title: 'Your clinic stays yours',
    desc: 'Your doctors, your patients, your appointments — private to your clinic, always. We never sell or share your data, and you can stop using MediBook any day, no strings attached.',
  },
  {
    title: 'Nothing fake, ever',
    desc: 'No invented ratings, no made-up availability, no fake reviews — on your booking page or on ours. Patients see real doctors, real timings, and real credentials that you control.',
  },
  {
    title: 'We build with you',
    desc: 'MediBook is free during Early Access while we shape it with feedback from real clinics. The clinics using it today decide what we build tomorrow.',
  },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <PlatformHeader />

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        {/* Editorial hero — left-aligned, quiet */}
        <div className="animate-fade-up">
          <div className="mb-6 h-1 w-14 rounded-full bg-brand-600" />
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-brand-600">About MediBook</p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            More time for patients.<br />Less time on the phone.
          </h1>
        </div>

        {/* Narrative */}
        <div className="mt-10 space-y-6 text-[17px] leading-8 text-gray-600 animate-fade-up delay-100">
          <p>
            Most clinics still juggle appointments through phone calls, paper registers, and
            WhatsApp chats. A missed call becomes a missed booking. A double-booked slot becomes
            a waiting-room argument. A patient who can't book at 10&nbsp;pm simply books somewhere else.
          </p>
          <p>
            None of this is the clinic's fault — good booking software was simply never built
            for them. Big hospital chains get custom systems and IT teams. Everyone else gets chaos.
          </p>
          <p className="font-medium text-ink-900">
            MediBook closes that gap: every clinic gets its own booking page, doctor portal,
            and patient records — ready in minutes, and simple enough that no one needs training.
          </p>
        </div>

        {/* Principles — numbered editorial rows, no cards */}
        <div className="mt-16 animate-fade-up delay-150">
          <h2 className="mb-2 font-display text-2xl font-semibold text-ink-900">What we stand for</h2>
          <p className="mb-8 text-sm text-gray-400">Four principles we don't compromise on.</p>
          <div className="divide-y divide-gray-100 border-y border-gray-100">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="grid gap-2 py-7 sm:grid-cols-[90px_1fr] sm:gap-6">
                <span className="font-display text-2xl font-semibold text-brand-200">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="mb-1.5 font-display text-lg font-semibold text-ink-900">{p.title}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What you get — inline two-column list, no card container */}
        <div className="mt-16 animate-fade-up delay-200">
          <h2 className="mb-2 font-display text-2xl font-semibold text-ink-900">What your clinic gets</h2>
          <p className="mb-6 text-sm text-gray-400">Everything a modern clinic needs to run its bookings — nothing it doesn't.</p>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              'Your own booking page, on your own link',
              'Patients book in under a minute — no app, no account',
              'A private portal for every doctor',
              'Visit notes and full patient history',
              'Automatic confirmations, reminders, and easy rescheduling',
              'Your branding: logo, colors, and credentials',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[15px] text-gray-600">
                <svg className="mt-1 flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Our promise — quiet, bordered, editorial */}
        <div className="mt-16 border-l-2 border-brand-600 pl-6 animate-fade-up delay-200 sm:pl-8">
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink-900">Our promise to every clinic</h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-gray-600">
            <li>MediBook is <strong className="text-ink-900">free during Early Access</strong> — every feature, no card, no limits.</li>
            <li>You'll get <strong className="text-ink-900">plenty of notice</strong> before pricing ever begins, and nothing is charged automatically.</li>
            <li>Clinics that join during Early Access get <strong className="text-ink-900">preferential terms</strong> when paid plans arrive.</li>
          </ul>
        </div>

        {/* Quiet closing — no gradient banner (that belongs to the home page) */}
        <div className="mt-20 border-t border-gray-100 pt-10 text-center animate-fade-up delay-200">
          <p className="font-display text-xl font-semibold text-ink-900">
            Ready when you are.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Set up takes minutes. And if you'd rather talk first, we read every message.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/admin/register')}
              className="rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700">
              Register your clinic
            </button>
            <button onClick={() => navigate('/contact')}
              className="rounded-full border border-gray-200 px-7 py-3 text-sm font-bold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50">
              Contact us
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        MediBook — Appointment Management Platform
      </footer>
    </div>
  )
}
