import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function getNextDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)  // Start from TODAY, not tomorrow
    return d.toISOString().split('T')[0]
  })
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function RescheduleAppointment() {
  const { id, cancelToken } = useParams()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('idle') // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('')

  const days = getNextDays(14)

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const { data } = await api.get(`/appointments/${id}`)
        if (data.success) {
          setAppointment(data.data)
        } else {
          setError('Failed to load appointment details')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load appointment')
      } finally {
        setLoading(false)
      }
    }

    fetchAppointment()
  }, [id])

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !appointment) return
    
    setSlotsLoading(true)
    setSelectedSlot('')
    setSlots([])
    
    api.get(`/doctors/${appointment.doctor_id}/slots?date=${selectedDate}`)
      .then(res => setSlots(res.data.availableSlots || []))
      .catch(err => {
        console.error(err)
        setSlots([])
      })
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, appointment])

  const handleReschedule = async (e) => {
    e.preventDefault()
    
    if (!selectedDate || !selectedSlot) {
      setMessage('Please select a date and time slot.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const { data } = await api.patch(
        `/appointments/${id}/reschedule/${cancelToken}`,
        {
          appointment_date: selectedDate,
          appointment_time: selectedSlot
        }
      )

      if (data.success) {
        setStatus('success')
        setMessage(data.message || 'Appointment rescheduled successfully!')
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to reschedule appointment.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'An error occurred while rescheduling.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    )
  }

  if (error && status === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-500 font-medium mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Appointment not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Logo />
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">Reschedule Appointment</h1>
          <p className="mt-2 text-gray-600">Choose a new date and time for your appointment</p>
        </div>

        {/* Current appointment info */}
        {status === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">Current Appointment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600">Doctor</p>
                <p className="font-medium text-gray-900">{appointment.doctor?.full_name}</p>
              </div>
              <div>
                <p className="text-blue-600">Specialization</p>
                <p className="font-medium text-gray-900">{appointment.doctor?.specialization}</p>
              </div>
              <div>
                <p className="text-blue-600">Current Date</p>
                <p className="font-medium text-gray-900">{formatDisplayDate(appointment.appointment_date)}</p>
              </div>
              <div>
                <p className="text-blue-600">Current Time</p>
                <p className="font-medium text-gray-900">{formatTime(appointment.appointment_time)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        {status === 'idle' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleReschedule} className="space-y-8">
              {/* Date Selection */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-4">Select New Date</label>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  {days.map(date => {
                    const today = getTodayDate()
                    const isPastDate = date < today
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => !isPastDate && setSelectedDate(date)}
                        disabled={isPastDate}
                        className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                          isPastDate
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                            : selectedDate === date
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isPastDate ? 'Cannot select past dates' : ''}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        {new Date(date).getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <label className="block text-lg font-medium text-gray-900 mb-4">Select New Time</label>
                  {slotsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading available slots...</p>
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {slots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-lg font-medium transition-colors ${
                            selectedSlot === slot
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No available slots for this date</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedDate || !selectedSlot || submitting}
                  className={`flex-1 py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                    !selectedDate || !selectedSlot || submitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {submitting ? 'Rescheduling...' : 'Confirm New Appointment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-medium text-lg mb-6">{message}</p>
            <p className="text-gray-600 mb-8">A confirmation email has been sent to your inbox.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-500 font-medium mb-6">{message}</p>
            <button
              onClick={() => {
                setStatus('idle')
                setMessage('')
                setSelectedDate('')
                setSelectedSlot('')
                setSlots([])
              }}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Rescheduling your appointment...</p>
          </div>
        )}
      </div>
    </div>
  )
}
