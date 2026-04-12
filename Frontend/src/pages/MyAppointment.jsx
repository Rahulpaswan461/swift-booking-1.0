import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PageLayout from '../components/PageLayout';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
};

const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const STATUS_STYLES = {
  confirmed:  'bg-green-50 text-green-700',
  pending:    'bg-yellow-50 text-yellow-700',
  cancelled:  'bg-red-50 text-red-600',
  completed:  'bg-blue-50 text-blue-700',
};

export default function MyAppointment() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [cancelling, setCancelling]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await api.get(`/appointments/${id}`);
        setAppointment(res.data.data || res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Appointment not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setAppointment(a => ({ ...a, status: 'cancelled' }));
      setShowConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <PageLayout>
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    </PageLayout>
  );

  if (error) return (
    <PageLayout>
      <div className="text-center py-16">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-gray-600 font-medium">{error}</p>
        <button onClick={() => navigate('/doctors')} className="btn-primary mt-6">
          Book a new appointment
        </button>
      </div>
    </PageLayout>
  );

  const isCancellable = appointment?.status === 'confirmed' || appointment?.status === 'pending';

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My appointment</h1>
        <p className="text-gray-500 text-sm mt-1">Booking details</p>
      </div>

      <div className="card mb-4">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-medium text-gray-500">Booking ID</span>
          <span className="font-mono text-xs text-gray-400">{appointment._id}</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">👨‍⚕️</span>
            <div>
              <p className="text-xs text-gray-400">Doctor</p>
              <p className="font-semibold text-gray-900">
                {appointment.doctor_id?.fullName
                  ? `Dr. ${appointment.doctor_id.fullName}`
                  : 'Your doctor'}
              </p>
              {appointment.doctor_id?.specialization && (
                <p className="text-blue-500 text-xs">{appointment.doctor_id.specialization}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">📅 Date</p>
              <p className="font-medium text-gray-900 text-sm">{formatDate(appointment.appointment_date)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">🕐 Time</p>
              <p className="font-medium text-gray-900 text-sm">{formatTime(appointment.appointment_time)}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <p className="text-xs text-gray-400">Status</p>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[appointment.status] || 'bg-gray-100 text-gray-600'}`}>
              {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1)}
            </span>
          </div>

          {appointment.notes && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">📝 Notes</p>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel section */}
      {isCancellable && !showConfirm && (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all"
        >
          Cancel appointment
        </button>
      )}

      {/* Cancel confirmation dialog */}
      {showConfirm && (
        <div className="card border-red-100 bg-red-50">
          <p className="font-semibold text-red-800 mb-1">Cancel this appointment?</p>
          <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {cancelling ? 'Cancelling...' : 'Yes, cancel it'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {appointment.status === 'cancelled' && (
        <div className="text-center mt-4">
          <button onClick={() => navigate('/doctors')} className="btn-primary">
            Book a new appointment
          </button>
        </div>
      )}
    </PageLayout>
  );
}
