import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoModal from '../components/DemoModal';
import PlatformHeader from '../components/PlatformHeader';

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ number, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-lg shadow-brand-600/20">
        {number}
      </div>
      <h3 className="font-semibold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function WhyCard({ text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}

export default function MedibookProductPage() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header — shared across all platform pages */}
      <PlatformHeader />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Early Access — currently free for all clinics &middot; No card required
          </div>

          <h1 className="max-w-4xl mx-auto font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
            Create Your Own Clinic Booking Platform in{' '}
            <span className="text-brand-600">Minutes</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
            Stop managing appointments on WhatsApp and spreadsheets. Launch your own branded booking portal,
            manage doctors, schedules, and patients from one dashboard.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/admin/register')}
              className="rounded-2xl bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-600/20 transition hover:bg-brand-700 flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L2 7l9 5 9-5-9-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 12l9 5 9-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Start Free
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-bold text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 3V2M10 3V2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              View Demo
            </button>
          </div>

          {/* Illustration placeholder */}
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-2 shadow-2xl">
              <div className="rounded-xl bg-white p-6 grid grid-cols-3 gap-4">
                {/* Clinic Dashboard mockup */}
                <div className="rounded-lg border border-gray-100 p-4 bg-gradient-to-br from-brand-50 to-white">
                  <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">Clinic Dashboard</div>
                  <div className="space-y-2">
                    <div className="h-3 bg-brand-100 rounded w-3/4"></div>
                    <div className="h-3 bg-brand-50 rounded w-1/2"></div>
                    <div className="h-8 bg-brand-100 rounded mt-3"></div>
                    <div className="h-3 bg-brand-50 rounded w-2/3"></div>
                  </div>
                </div>
                {/* Doctor Dashboard mockup */}
                <div className="rounded-lg border border-gray-100 p-4 bg-gradient-to-br from-green-50 to-white">
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Doctor Portal</div>
                  <div className="space-y-2">
                    <div className="h-3 bg-green-100 rounded w-3/4"></div>
                    <div className="h-3 bg-green-50 rounded w-1/2"></div>
                    <div className="h-8 bg-green-100 rounded mt-3"></div>
                    <div className="h-3 bg-green-50 rounded w-2/3"></div>
                  </div>
                </div>
                {/* Patient Booking Portal mockup */}
                <div className="rounded-lg border border-gray-100 p-4 bg-gradient-to-br from-amber-50 to-white">
                  <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">Patient Portal</div>
                  <div className="space-y-2">
                    <div className="h-3 bg-amber-100 rounded w-3/4"></div>
                    <div className="h-3 bg-amber-50 rounded w-1/2"></div>
                    <div className="h-8 bg-amber-100 rounded mt-3"></div>
                    <div className="h-3 bg-amber-50 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-semibold text-ink-900">How MediBook Works</h2>
          <p className="mt-3 text-gray-500">From registration to your first booking — in 6 simple steps</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <StepCard
            number={1}
            title="Register Your Clinic"
            desc="Sign up in 2 minutes with your clinic name and email."
          />
          <StepCard
            number={2}
            title="Get Your Platform"
            desc="Receive your own booking URL — e.g., apollo.medibook.com"
          />
          <StepCard
            number={3}
            title="Add Your Doctors"
            desc="Invite doctors with their name, email, and specialization."
          />
          <StepCard
            number={4}
            title="Doctors Log In"
            desc="Doctors get credentials via email and set their schedules."
          />
          <StepCard
            number={5}
            title="Share With Patients"
            desc="Share your booking URL on WhatsApp, Instagram, or your website."
          />
          <StepCard
            number={6}
            title="Patients Book Online"
            desc="Patients pick a doctor, choose a slot, and get confirmed instantly."
          />
        </div>

        {/* Arrow connectors between steps */}
        <div className="hidden lg:flex items-center justify-center gap-0 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-300">
              <path d="M9 6l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 bg-surface-50">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-semibold text-ink-900">Everything You Need to Run Appointments</h2>
          <p className="mt-3 text-gray-500">One platform. Zero marketplace competition. Full control.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="13" rx="2" stroke="#0171be" strokeWidth="1.5" />
                <path d="M5 1v2M11 1v2M2 6h12" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="Dedicated Booking Portal"
            desc="Your own branded URL. Patients see your clinic, not a marketplace."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="3" stroke="#0171be" strokeWidth="1.5" />
                <path d="M3 14c0-2.761 2.239-4.5 5-4.5s5 1.739 5 4.5" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="Doctor Management"
            desc="Add doctors, set schedules, manage availability — all from your dashboard."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#0171be" strokeWidth="1.5" />
                <path d="M8 5v3l2 2" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="Appointment Scheduling"
            desc="Online calendar with rescheduling, cancellation, and email confirmations."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="4" width="12" height="10" rx="2" stroke="#0171be" strokeWidth="1.5" />
                <path d="M2 8h12" stroke="#0171be" strokeWidth="1.5" />
              </svg>
            }
            title="Patient Management"
            desc="Track patient history, notes, and appointment records securely."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="#0171be" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            }
            title="Analytics Dashboard"
            desc="See today's appointments, weekly trends, and doctor performance at a glance."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="2" stroke="#0171be" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" stroke="#0171be" strokeWidth="1.5" />
              </svg>
            }
            title="Role-Based Access"
            desc="Clinic admin, doctor, and patient roles — each with their own secure login."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l3 3 6-6" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Email Confirmations"
            desc="Automated booking confirmations, rescheduling alerts, and cancellation notices."
          />
          <FeatureCard
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C5 2 2 4.5 2 8s3 6 6 6 6-2.5 6-6-3-6-6-6z" stroke="#0171be" strokeWidth="1.5" />
                <path d="M6 8l1.5 1.5L11 6" stroke="#0171be" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Secure & Private"
            desc="Encrypted data, tenant isolation, and secure OTP-based patient verification."
          />
        </div>
      </section>

      {/* Why Clinics Choose MediBook */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink-900">
              Why Clinics Choose MediBook
            </h2>
            <p className="mt-3 text-gray-500 mb-8">
              We don't put you in a marketplace. You own your platform, your patients, and your growth.
            </p>

            <div className="space-y-4">
              <WhyCard text="You own your booking platform — not a listing on someone else's site" />
              <WhyCard text="You own your patient data — access records anytime" />
              <WhyCard text="Your own branded portal — add your logo and colors" />
              <WhyCard text="No commission on bookings — we never take a cut" />
              <WhyCard text="No marketplace competition — your patients stay yours" />
              <WhyCard text="Your own subdomain — later upgrade to your custom domain" />
              <WhyCard text="Complete control — add doctors, set schedules, manage everything" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-8">
            <div className="text-center">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">Your Booking URL</p>
              <div className="rounded-xl bg-white border border-brand-200 px-6 py-4 shadow-sm">
                <span className="text-gray-400 text-sm">https://</span>
                <span className="text-brand-700 font-semibold">apollo</span>
                <span className="text-gray-400 text-sm">.medibook.com</span>
              </div>
              <p className="text-sm text-gray-500 mt-4">Share this with patients on WhatsApp, Instagram, or your website.</p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-gray-700">Patients see <strong>your</strong> brand, not ours</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-gray-700">You control the scheduling</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-gray-700">Zero commission — 100% yours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="rounded-[28px] bg-gradient-to-r from-brand-600 to-brand-700 p-8 sm:p-12 text-center shadow-2xl shadow-brand-600/20">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white mb-3">
            Ready to Launch Your Booking Platform?
          </h2>
          <p className="text-brand-100 mb-6 max-w-lg mx-auto">
            Get started in 2 minutes. No credit card required. Free for 14 days.
          </p>
          <button
            onClick={() => navigate('/admin/register')}
            className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-brand-700 shadow-xl transition hover:bg-brand-50 inline-flex items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 7l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M2 12l9 5 9-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Start Free — No Credit Card
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-display font-semibold text-lg text-ink-900 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </span>
              <span>MediBook</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} MediBook. All rights reserved.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin/login')}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/admin/register')}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Register Clinic
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal isOpen={showDemo} onClose={() => setShowDemo(false)} />
    </div>
  );
}
