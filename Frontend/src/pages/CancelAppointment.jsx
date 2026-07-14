import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Logo from '../components/Logo';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CancelAppointment() {
  const { id, cancelToken } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`/appointments/${id}`)
      .then((res) => setAppointment(res.data.data))
      .catch(() => setAppointment(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setStatus('loading');
    try {
      const { data } = await api.patch(`/appointments/${id}/cancel/${cancelToken}`);
      setStatus('success');
      setMessage(data.message || 'Appointment cancelled successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'An error occurred while cancelling.');
    }
  };

  const alreadyCancelled = appointment?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo showClinicName />
            <div className="hidden h-8 w-px bg-gray-100 sm:block" />
            <span className="hidden text-xs font-semibold text-gray-600 uppercase tracking-wide sm:block">Cancel appointment</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100 hover:text-gray-900"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-[24px] border border-surface-100 bg-white p-8 shadow-sm animate-fade-up">

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Loading your appointment...
            </div>
          ) : status === 'success' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 animate-scale-in">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Appointment cancelled</h1>
              <p className="mb-1 text-sm text-gray-600">Your slot has been released for other patients.</p>
              <p className="mb-6 text-xs text-gray-400">A cancellation confirmation is on its way to you.</p>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Book a new appointment
              </button>
            </div>
          ) : status === 'error' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Couldn't cancel</h1>
              <p className="mb-6 text-sm text-gray-500">{message}</p>
              <button
                onClick={() => { setStatus('idle'); setMessage(''); }}
                className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Try again
              </button>
            </div>
          ) : alreadyCancelled ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Already cancelled</h1>
              <p className="mb-6 text-sm text-gray-500">This appointment was cancelled earlier — nothing more to do.</p>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
              >
                Book a new appointment
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8">
                    <rect x="4" y="5" width="16" height="16" rx="2.5" />
                    <path d="M8 3v4M16 3v4M4 10h16M10 14.5l4 4M14 14.5l-4 4" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-semibold text-ink-900">Cancel this appointment?</h1>
                <p className="mt-1 text-sm text-gray-500">The slot will be released — this can't be undone.</p>
              </div>

              {/* What's being cancelled */}
              {appointment && (
                <dl className="mb-6 divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-surface-50/60 px-4">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Doctor</dt>
                    <dd className="text-sm font-semibold text-ink-900">Dr. {appointment.doctor?.full_name}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Date</dt>
                    <dd className="text-sm font-semibold text-ink-900">{formatDisplayDate(appointment.appointment_date)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Time</dt>
                    <dd className="text-sm font-bold text-brand-700">{formatTime(appointment.appointment_time)}</dd>
                  </div>
                </dl>
              )}

              <div className="space-y-2.5">
                <button
                  onClick={handleCancel}
                  disabled={status === 'loading'}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                        <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Cancelling...
                    </>
                  ) : 'Yes, cancel appointment'}
                </button>
                <button
                  onClick={() => appointment?.cancel_token
                    ? navigate(`/reschedule/${id}/${cancelToken}`)
                    : navigate('/')}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  Reschedule instead
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2 text-sm font-medium text-gray-400 transition hover:text-gray-600"
                >
                  Keep my appointment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
