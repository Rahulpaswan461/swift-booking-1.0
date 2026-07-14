import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PlatformHeader from '../components/PlatformHeader'

const FAQS = [
  {
    q: 'Is MediBook really free right now?',
    a: 'Yes. During Early Access every plan and every feature is free — no card, no limits, no catch. We want feedback from real clinics before we want payments.',
  },
  {
    q: 'What happens when paid plans launch?',
    a: "You'll be notified well in advance and nothing will ever be charged automatically. Your data stays exactly where it is, and clinics that join during Early Access get preferential terms when pricing begins.",
  },
  {
    q: 'Do my patients need to create accounts or install an app?',
    a: 'No. Patients verify with a one-time code sent to their email or phone and book in under a minute. Returning patients are recognised automatically. Confirmations, reminders, and cancel/reschedule links arrive without any login.',
  },
  {
    q: "Is my clinic's data private?",
    a: "Completely. Your doctors, patients, and appointments are visible only to your clinic — never to anyone else. We never sell or share your data, and everything patients use to book stays private between them and your clinic.",
  },
  {
    q: 'Can I use my own branding?',
    a: 'Yes — your booking page runs on your own link with your logo, brand color, tagline, and credential badges (like accreditations). Confirmation emails carry your clinic’s name and colors too.',
  },
  {
    q: 'What if I need help getting set up?',
    a: 'Message us from the Contact page or the Help & Support button inside your dashboard. Early Access clinics get priority — you’re talking to the people building the product, not a ticket queue.',
  },
  {
    q: 'Can my clinic leave anytime?',
    a: 'Of course. There is no lock-in and no contract. If MediBook isn’t making your clinic’s life easier, you can stop using it any day.',
  },
]

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-surface-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold text-ink-900">{item.q}</span>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all
          ${open ? 'rotate-180 border-brand-200 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-400'}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 -mt-1">
          <p className="text-sm leading-relaxed text-gray-500">{item.a}</p>
        </div>
      )}
    </div>
  )
}

// ── Planned pricing — placeholders, edit freely before launch ──
// Shown with "Free during Early Access" so future pricing never
// comes as a surprise to clinics already on the platform.
const PLANS = [
  {
    name: 'Starter',
    price: 0,
    tagline: 'For solo practitioners getting started',
    features: [
      '1 doctor',
      '50 bookings / month',
      'Your own booking page & link',
      'Email confirmations & reminders',
      'Cancel / reschedule links for patients',
    ],
  },
  {
    name: 'Pro',
    price: 999,
    highlighted: true,
    tagline: 'For growing clinics with multiple doctors',
    features: [
      'Up to 5 doctors',
      'Unlimited bookings',
      'Custom branding & badges',
      'SMS confirmations (usage billed separately)',
      'Session notes & patient history',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 2499,
    tagline: 'For hospitals and multi-branch clinics',
    features: [
      'Unlimited doctors',
      'Unlimited bookings',
      'Everything in Pro',
      'Onboarding assistance',
      'Dedicated support',
    ],
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="min-h-screen bg-surface-50">
      <PlatformHeader />

      <main className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Early Access banner */}
        <div className="mx-auto mb-10 max-w-2xl text-center animate-fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.8 3.6L13 5.2l-3 2.9.7 4L7 10.2 3.3 12.1l.7-4-3-2.9 4.2-.6L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Early Access — every plan is free right now
          </div>
          <h1 className="font-display text-4xl font-semibold text-ink-900 sm:text-5xl">
            Simple pricing, when it arrives
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            MediBook is completely free while we're in Early Access — no card, no limits, no catch.
            These are the plans we intend to launch later, so there are never any surprises.
            Every clinic will be notified well in advance.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[28px] border bg-white p-7 shadow-sm animate-fade-up opacity-0
                ${plan.highlighted ? 'border-brand-300 shadow-xl shadow-brand-900/10 lg:-translate-y-2' : 'border-surface-100'}`}
              style={{ animationDelay: `${i * 90}ms`, animationFillMode: 'forwards' }}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                  Most popular
                </span>
              )}

              <h2 className="font-display text-2xl font-semibold text-ink-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>

              {/* Price — future price struck through, free now */}
              <div className="mt-5 flex items-end gap-2">
                {plan.price > 0 ? (
                  <>
                    <span className="text-lg font-semibold text-gray-400 line-through">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="font-display text-4xl font-semibold text-ink-900">₹0</span>
                    <span className="pb-1 text-sm text-gray-400">/month</span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-4xl font-semibold text-ink-900">₹0</span>
                    <span className="pb-1 text-sm text-gray-400">/month</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-green-600">
                {plan.price > 0 ? 'Free during Early Access' : 'Free forever'}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="#1d7f72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/admin/register')}
                className={`mt-7 w-full rounded-2xl py-3.5 text-sm font-bold transition
                  ${plan.highlighted
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50'}`}
              >
                Get started free
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.22em] text-brand-600">Common questions</p>
          <h2 className="mb-8 text-center font-display text-3xl font-semibold text-ink-900">
            Answered before you have to ask
          </h2>
          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-400">
            Something else on your mind?{' '}
            <button onClick={() => navigate('/contact')} className="font-semibold text-brand-600 transition hover:text-brand-700">
              Ask us directly →
            </button>
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        MediBook — Appointment Management Platform
      </footer>
    </div>
  )
}
