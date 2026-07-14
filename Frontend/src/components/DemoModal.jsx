import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  demoWalkthroughSteps,
  demoDoctors,
  demoAppointments,
  demoStats,
  demoClinicInfo,
  demoNotes,
  demoTrustSignals,
  demoTestimonials,
  demoSecurityBadges,
} from '../data/demoData';

// ── Tiny sub-components ───────────────────────────────────────

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={i} width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.4 3.5 14.8l.9-5L.8 6.3l5-.7z" />
        </svg>
      ))}
      {half && (
        <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" opacity="0.6">
          <path d="M8 1l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.4 3.5 14.8l.9-5L.8 6.3l5-.7z" />
        </svg>
      )}
      <span className="text-[9px] font-semibold text-gray-500 ml-0.5">{rating}</span>
    </span>
  );
}

function StepCard({ step, index }) {
  const colorMap = {
    brand: 'from-brand-50 to-brand-100 border-brand-200 text-brand-700',
    green: 'from-green-50 to-green-100 border-green-200 text-green-700',
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 ${colorMap[step.color] || colorMap.brand} animate-fade-up opacity-0`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
    >
      <div className="text-2xl mb-2">{step.icon}</div>
      <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
      <p className="text-xs opacity-80 leading-relaxed">{step.desc}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Confirmed: 'bg-green-100 text-green-700',
    Pending: 'bg-amber-100 text-amber-700',
    Completed: 'bg-brand-100 text-brand-700',
    Cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}

// ── Toast Notification ───────────────────────────────────────

function Toast({ message, icon, show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 bg-ink-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-black/30">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium">{message}</span>
        <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100 transition">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Guide Hint — tells the visitor what to try next ──────────

function GuideHint({ children }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 animate-fade-in">
      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white">
        ?
      </span>
      <p className="text-[11px] leading-relaxed text-brand-800">{children}</p>
    </div>
  );
}

// ── Progress Steps ───────────────────────────────────────────

function ProgressSteps({ current, labels }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div className={`flex flex-col items-center flex-1`}>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                i < current
                  ? 'bg-green-500 text-white'
                  : i === current
                  ? 'bg-brand-600 text-white ring-2 ring-brand-200'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < current ? (
                <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-[7px] mt-0.5 font-medium ${i <= current ? 'text-brand-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className="w-3 h-px mb-[10px]">
              <div className={`h-full ${i < current ? 'bg-green-400' : 'bg-gray-200'}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Walkthrough Section ──────────────────────────────────────

function WalkthroughSection({ onTryDemo }) {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Live Demo
        </div>
        <h3 className="font-display text-2xl font-semibold text-ink-900">
          See MediBook in Action
        </h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Explore how a real clinic runs on MediBook — from patient bookings to admin dashboard.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {demoWalkthroughSteps.map((step, i) => (
          <StepCard key={i} step={step} index={i} />
        ))}
      </div>

      {/* Clinic Preview Card */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-surface-50 p-5 shadow-sm mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-ink-900">{demoClinicInfo.name}</h4>
            <p className="text-xs text-gray-400">{demoClinicInfo.tagline}</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-full border border-brand-200">
            Demo Data
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <p className="text-lg font-bold text-brand-700">{demoStats.totalDoctors}</p>
            <p className="text-[10px] text-gray-400">Doctors</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <p className="text-lg font-bold text-green-600">{demoStats.todayAppointments}</p>
            <p className="text-[10px] text-gray-400">Today</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <p className="text-lg font-bold text-amber-600">{demoStats.completionRate}</p>
            <p className="text-[10px] text-gray-400">Completion</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <p className="text-lg font-bold text-purple-600">{demoStats.totalAppointments}</p>
            <p className="text-[10px] text-gray-400">This Week</p>
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="rounded-2xl border border-gray-100 bg-surface-50 p-4 mb-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-base font-bold text-ink-900">{demoTrustSignals.clinicsOnboard}</p>
            <p className="text-[9px] text-gray-400">Clinics Trust Us</p>
          </div>
          <div>
            <p className="text-base font-bold text-ink-900">{demoTrustSignals.monthlyBookings}</p>
            <p className="text-[9px] text-gray-400">Bookings/Month</p>
          </div>
          <div>
            <p className="text-base font-bold text-ink-900">{demoTrustSignals.uptime}</p>
            <p className="text-[9px] text-gray-400">Uptime</p>
          </div>
        </div>
      </div>

      {/* Testimonial */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-5">
        <div className="flex items-start gap-2 mb-2">
          <StarRating rating={demoTrustSignals.avgRating} />
        </div>
        <p className="text-xs text-gray-600 italic leading-relaxed mb-2">
          &ldquo;{demoTestimonials[0].text}&rdquo;
        </p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-bold text-brand-700">
            RK
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-900">{demoTestimonials[0].name}</p>
            <p className="text-[9px] text-gray-400">{demoTestimonials[0].clinic}</p>
          </div>
        </div>
      </div>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 mb-5">
        {demoSecurityBadges.map((badge) => (
          <div key={badge.label} className="flex items-center gap-1 text-[9px] text-gray-400">
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2">
        <button
          onClick={onTryDemo}
          className="flex-1 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Try Interactive Demo
        </button>
        <button
          onClick={() => navigate('/admin/register')}
          className="rounded-2xl border border-brand-300 bg-brand-50 py-3.5 px-5 text-sm font-bold text-brand-700 transition hover:bg-brand-100 flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L2 7l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          Start Free
        </button>
      </div>
    </div>
  );
}

// ── Patient Portal Demo ──────────────────────────────────────

function PatientDemo() {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [step, setStep] = useState(1); // 1=verify, 2=doctors, 3=slots, 4=confirmed
  const [toast, setToast] = useState({ show: false, message: '', icon: '' });

  const progressLabels = ['Verify', 'Doctor', 'Slot', 'Done'];

  const handleOtpSend = () => {
    setOtpSent(true);
  };

  const handleOtpVerify = () => {
    setOtpVerified(true);
    setStep(2);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(4);
    setToast({ show: true, message: 'Booking confirmed! Check your email.', icon: '✅' });
  };

  const handleReset = () => {
    setStep(1);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setOtpSent(false);
    setOtpVerified(false);
  };

  return (
    <div className="relative">
      {/* Toast */}
      <Toast
        message={toast.message}
        icon={toast.icon}
        show={toast.show}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Progress */}
      <ProgressSteps current={step - 1} labels={progressLabels} />

      {/* Guided hint for the current step */}
      {step === 1 && !otpSent && (
        <GuideHint><strong>Try it:</strong> click "Send OTP". In the real product the patient receives a real 6-digit code by email or SMS — no account, no password.</GuideHint>
      )}
      {step === 1 && otpSent && !otpVerified && (
        <GuideHint>The code is pre-filled for the demo — click <strong>"Verify &amp; Continue"</strong>.</GuideHint>
      )}
      {step === 2 && (
        <GuideHint><strong>Pick any doctor</strong> to see their live availability. Patients only ever see this clinic's doctors.</GuideHint>
      )}
      {step === 3 && (
        <GuideHint><strong>Choose a time slot</strong> — the booking confirms instantly and a confirmation goes out automatically.</GuideHint>
      )}
      {step === 4 && (
        <GuideHint>That's the entire flow — under a minute, and the patient never had to create an account. Cancel and reschedule links arrive in the confirmation.</GuideHint>
      )}

      {/* Demo phone mockup */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50 overflow-hidden">
        {/* Notch */}
        <div className="flex justify-center pt-2">
          <div className="w-20 h-4 rounded-b-xl bg-gray-900" />
        </div>

        {/* Status bar */}
        <div className="bg-surface-50 px-4 py-1.5 flex items-center justify-between text-[9px] text-gray-400">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Online
          </span>
        </div>

        {/* Step 1: OTP Verification */}
        {step === 1 && (
          <div className="p-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-600/20">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-ink-900">Welcome to {demoClinicInfo.name}</p>
              <p className="text-[10px] text-gray-400 mt-1">Verify to continue</p>
            </div>

            {!otpSent ? (
              <div>
                <div className="mb-3">
                  <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Phone or Email</label>
                  <div className="mt-1 p-2.5 rounded-xl border border-gray-200 bg-surface-50 text-[11px] text-ink-900 font-medium">
                    +91 98765 43210
                  </div>
                </div>
                <button
                  onClick={handleOtpSend}
                  className="w-full py-2.5 rounded-xl bg-brand-600 text-[11px] font-bold text-white hover:bg-brand-700 transition shadow-sm"
                >
                  Send OTP
                </button>
              </div>
            ) : !otpVerified ? (
              <div>
                <label className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Enter OTP</label>
                <div className="mt-1.5 flex gap-2 justify-center">
                  {[1, 2, 3, 4].map((d) => (
                    <div
                      key={d}
                      className={`w-9 h-11 rounded-xl border-2 text-center text-sm font-bold flex items-center justify-center transition ${
                        d <= 3
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-300'
                      }`}
                    >
                      {d <= 3 ? [5, 3, 8][d - 1] : ''}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleOtpVerify}
                  className="w-full py-2.5 rounded-xl bg-brand-600 text-[11px] font-bold text-white hover:bg-brand-700 transition mt-3 shadow-sm"
                >
                  Verify & Continue
                </button>
                <p className="text-[9px] text-gray-400 text-center mt-2">OTP sent to +91 98765 43210</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 2: Doctor List */}
        {step === 2 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-ink-900">Our Doctors</p>
              <span className="text-[9px] text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded-full">
                {demoDoctors.length} available
              </span>
            </div>
            <div className="space-y-2">
              {demoDoctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep(3); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 border-2 border-brand-200 flex items-center justify-center text-[10px] font-bold text-brand-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                    {doc.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-ink-900 truncate">Dr. {doc.full_name}</p>
                      <StarRating rating={doc.rating} />
                    </div>
                    <p className="text-[10px] text-brand-600">{doc.specialization} · {doc.experience}</p>
                    <p className="text-[9px] text-gray-400">{doc.patients.toLocaleString()} patients · {doc.next_available}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-300 flex-shrink-0 group-hover:text-brand-500 transition">
                    <path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Slot Selection */}
        {step === 3 && selectedDoctor && (
          <div className="p-4">
            <button onClick={() => setStep(2)} className="text-[10px] text-brand-600 font-medium mb-3 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M7 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Back to Doctors
            </button>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-brand-50 to-white border border-brand-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-200 to-brand-300 flex items-center justify-center text-xs font-bold text-brand-800">
                {selectedDoctor.full_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink-900">Dr. {selectedDoctor.full_name}</p>
                <p className="text-[10px] text-brand-600">{selectedDoctor.specialization}</p>
                <StarRating rating={selectedDoctor.rating} />
              </div>
            </div>
            <p className="text-xs font-semibold text-ink-900 mb-3">Available Slots — <span className="text-brand-600">{selectedDoctor.next_available}</span></p>
            <div className="grid grid-cols-3 gap-2">
              {selectedDoctor.slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleSelectSlot(slot)}
                  className="py-2.5 rounded-xl border-2 border-gray-200 text-[11px] font-semibold text-ink-900 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition active:scale-95"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && selectedDoctor && (
          <div className="p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30 animate-scale-in">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M6 12l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-bold text-green-700 mb-1">Booking Confirmed!</p>
            <p className="text-[11px] text-gray-500 mb-4">
              A confirmation has been sent to +91 98765 43210
            </p>
            <div className="rounded-xl bg-gradient-to-br from-surface-50 to-white p-4 text-left mb-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400">Doctor</span>
                <span className="text-[11px] font-semibold text-ink-900">Dr. {selectedDoctor.full_name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400">Specialization</span>
                <span className="text-[11px] font-semibold text-brand-600">{selectedDoctor.specialization}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400">Date</span>
                <span className="text-[11px] font-semibold text-ink-900">{selectedDoctor.next_available}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-400">Time</span>
                <span className="text-[11px] font-semibold text-ink-900">{selectedSlot}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Status</span>
                <StatusBadge status="Confirmed" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-[11px] font-bold text-white hover:bg-brand-700 transition shadow-sm"
              >
                Book Another
              </button>
              <button
                onClick={handleReset}
                className="py-2.5 px-4 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-surface-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="border-t border-gray-100 px-4 py-2 flex justify-around">
          {['🏠', '📅', '👤'].map((icon, i) => (
            <div key={i} className={`text-lg ${i === 0 ? 'opacity-100' : 'opacity-30'}`}>
              {icon}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Live interactive demo — click to book an appointment
      </p>
    </div>
  );
}

// ── Admin Dashboard Demo ─────────────────────────────────────

function AdminDemo() {
  const [filter, setFilter] = useState('All');
  const maxBar = Math.max(...demoStats.weeklyTrend.map(d => d.count));

  const filtered = filter === 'All' ? demoAppointments : demoAppointments.filter(a => a.status === filter);

  return (
    <div className="relative">
      <GuideHint>This is the <strong>clinic owner's dashboard</strong> — every number here is scoped to their clinic only. Try the appointment <strong>filters</strong> below the chart.</GuideHint>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50 overflow-hidden">
        {/* Admin header */}
        <div className="bg-gradient-to-r from-ink-900 to-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Admin Dashboard</p>
              <p className="text-[9px] text-gray-400">{demoClinicInfo.name}</p>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-brand-300 bg-brand-600/30 px-2 py-0.5 rounded-full border border-brand-500/30">
            Demo
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 p-3">
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-brand-50 to-white border border-brand-100">
            <p className="text-base font-bold text-brand-700">{demoStats.todayAppointments}</p>
            <p className="text-[9px] text-gray-500">Today</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100">
            <p className="text-base font-bold text-green-700">{demoStats.completionRate}</p>
            <p className="text-[9px] text-gray-500">Rate</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
            <p className="text-base font-bold text-amber-700">{demoStats.totalAppointments}</p>
            <p className="text-[9px] text-gray-500">This Week</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <p className="text-base font-bold text-purple-700">{demoStats.totalDoctors}</p>
            <p className="text-[9px] text-gray-500">Doctors</p>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-ink-900">Weekly Trend</p>
            <span className="text-[9px] text-green-600 font-semibold">↑ 18% vs last week</span>
          </div>
          <div className="flex items-end gap-2 h-16">
            {demoStats.weeklyTrend.map((d) => {
              const isPeak = d.count === maxBar;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
                  <span className="text-[8px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition">{d.count}</span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isPeak
                        ? 'bg-gradient-to-t from-brand-600 to-brand-400'
                        : 'bg-brand-200 group-hover:bg-brand-300'
                    }`}
                    style={{ height: `${(d.count / maxBar) * 100}%`, minHeight: '4px' }}
                  />
                  <span className="text-[8px] text-gray-400">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold text-ink-900 mb-2">Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-brand-50 border border-brand-100 text-center cursor-default hover:bg-brand-100 transition">
              <p className="text-base">👨‍⚕️</p>
              <p className="text-[9px] font-medium text-brand-700">Add Doctor</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 border border-green-100 text-center cursor-default hover:bg-green-100 transition">
              <p className="text-base">📊</p>
              <p className="text-[9px] font-medium text-green-700">Reports</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center cursor-default hover:bg-amber-100 transition">
              <p className="text-base">📧</p>
              <p className="text-[9px] font-medium text-amber-700">Notifications</p>
            </div>
          </div>
        </div>

        {/* Appointments table */}
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-ink-900">Appointments</p>
            <div className="flex gap-1">
              {['All', 'Confirmed', 'Pending'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold transition ${
                    filter === f
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-surface-50 text-gray-500 hover:bg-surface-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {filtered.map((apt) => (
              <div key={apt.id} className="flex items-center gap-2 p-2 rounded-lg bg-surface-50 border border-gray-50 hover:border-brand-100 transition">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-[9px] font-bold text-brand-700 flex-shrink-0">
                  {apt.patient[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-ink-900 truncate">{apt.patient}</p>
                  <p className="text-[9px] text-gray-400">{apt.doctor}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-gray-500">{apt.time}</p>
                  <StatusBadge status={apt.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Notes preview */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-ink-900">Session Notes</p>
          <span className="text-[9px] text-brand-600 font-medium">View All →</span>
        </div>
        <div className="space-y-2">
          {demoNotes.map((note) => (
            <div key={note.id} className="p-2.5 rounded-lg bg-surface-50 border border-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center text-[7px] font-bold text-brand-700">
                  {note.patient[0]}
                </div>
                <span className="text-[9px] font-semibold text-ink-900">{note.patient}</span>
                <span className="text-[9px] text-gray-400">·</span>
                <span className="text-[9px] text-gray-500">{note.date}</span>
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Doctor Dashboard Demo ────────────────────────────────────

function DoctorDemo() {
  const myAppointments = demoAppointments.filter(a => a.doctor.includes('Sarah'));

  return (
    <div className="relative">
      <GuideHint>Each doctor gets a <strong>separate login</strong> showing only their own schedule, patients, and session notes — never another doctor's.</GuideHint>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50 overflow-hidden">
        {/* Doctor header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            SJ
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-900">Dr. Sarah Johnson</p>
            <p className="text-[9px] text-green-600">Cardiology · <span className="font-semibold">Online</span></p>
          </div>
          <div className="ml-auto">
            <StarRating rating={4.9} />
          </div>
        </div>

        {/* Today's stats */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-3">
          <div className="text-center p-2 rounded-xl bg-surface-50 border border-gray-100">
            <p className="text-sm font-bold text-ink-900">{myAppointments.length}</p>
            <p className="text-[9px] text-gray-400">Today</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-surface-50 border border-gray-100">
            <p className="text-sm font-bold text-green-600">2.5h</p>
            <p className="text-[9px] text-gray-400">Avg/Visit</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-surface-50 border border-gray-100">
            <p className="text-sm font-bold text-brand-600">1.2K</p>
            <p className="text-[9px] text-gray-400">Total</p>
          </div>
        </div>

        {/* Today's appointments */}
        <div className="p-3">
          <p className="text-[10px] font-semibold text-ink-900 mb-2">Today's Schedule</p>
          <div className="space-y-1.5">
            {myAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-surface-50 hover:border-brand-200 transition">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-brand-600">{apt.time}</span>
                </div>
                <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-ink-900">{apt.patient}</p>
                  <p className="text-[9px] text-gray-400">Follow-up</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold text-ink-900 mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-50 to-white border border-brand-100 text-center cursor-default hover:shadow-sm transition">
              <p className="text-base">📝</p>
              <p className="text-[9px] font-medium text-brand-700">Add Notes</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-50 to-white border border-green-100 text-center cursor-default hover:shadow-sm transition">
              <p className="text-base">📅</p>
              <p className="text-[9px] font-medium text-green-700">My Schedule</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent patient notes */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-ink-900">Recent Notes</p>
          <span className="text-[9px] text-brand-600 font-medium">View All →</span>
        </div>
        <div className="space-y-2">
          {demoNotes.map((note) => (
            <div key={note.id} className="p-2.5 rounded-lg bg-surface-50 border border-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[7px] font-bold text-green-700">
                  {note.patient[0]}
                </div>
                <span className="text-[9px] font-semibold text-ink-900">{note.patient}</span>
                <span className="text-[9px] text-gray-400">·</span>
                <span className="text-[9px] text-gray-500">{note.date}</span>
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">{note.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────

export default function DemoModal({ isOpen, onClose }) {
  const [showDemo, setShowDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('patient'); // patient | admin | doctor

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setShowDemo(false);
      setActiveTab('patient');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/20">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink-900">
                {showDemo ? 'Interactive Demo' : 'MediBook Demo'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {showDemo ? 'Try the booking flow live' : 'See how it works'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-100 transition"
            aria-label="Close demo"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!showDemo ? (
            <WalkthroughSection onTryDemo={() => setShowDemo(true)} />
          ) : (
            <div>
              {/* Back to walkthrough */}
              <button
                onClick={() => setShowDemo(false)}
                className="text-[10px] text-brand-600 font-medium flex items-center gap-1 mb-4 hover:text-brand-700 transition"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M7 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Back to Overview
              </button>

              {/* Tab switcher */}
              <div className="flex gap-1 p-1 bg-surface-50 rounded-xl mb-5">
                {[
                  { key: 'patient', label: '📅 Patient', desc: 'Booking flow' },
                  { key: 'admin', label: '📊 Admin', desc: 'Dashboard' },
                  { key: 'doctor', label: '👨‍⚕️ Doctor', desc: 'My schedule' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-center transition ${
                      activeTab === tab.key
                        ? 'bg-white shadow-sm text-ink-900'
                        : 'text-gray-500 hover:text-ink-900'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">{tab.label}</p>
                    <p className="text-[9px] opacity-60">{tab.desc}</p>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="animate-fade-in">
                {activeTab === 'patient' && <PatientDemo />}
                {activeTab === 'admin' && <AdminDemo />}
                {activeTab === 'doctor' && <DoctorDemo />}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Demo data — nothing is saved
          </p>
          {showDemo && (
            <button
              onClick={() => setShowDemo(false)}
              className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              ← Overview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
