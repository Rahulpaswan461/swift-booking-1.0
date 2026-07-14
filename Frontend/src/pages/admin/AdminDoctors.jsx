import { useState, useEffect } from 'react'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', specialization: '', qualification: '', consultationFee: '' })

  // Set/edit consultation fee for an existing doctor
  const [feeModal, setFeeModal] = useState(null) // doctor | null
  const [feeValue, setFeeValue] = useState('')
  const [feeSaving, setFeeSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Shown ONCE after creating a doctor — { fullName, email, tempPassword, loginUrl }
  const [credentials, setCredentials] = useState(null)
  const [copiedField, setCopiedField] = useState('')

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDoctor, setScheduleDoctor] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '09:00', endTime: '17:00', slotDurationMin: 15 })
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)

  const fetchDoctors = () => {
    setLoading(true)
    adminApi.get('/admin/doctors')
      .then(res => setDoctors(res.data.data || res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDoctors() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await adminApi.post('/admin/doctors', form)
      const created = res.data.data
      setSuccess(`${form.fullName} added. Credentials sent to ${form.email}.`)
      if (created?.temp_password) {
        setCredentials({
          fullName: created.fullName,
          email: created.email,
          tempPassword: created.temp_password,
          loginUrl: created.login_url,
        })
      }
      setForm({ fullName: '', email: '', specialization: '', qualification: '', consultationFee: '' })
      setShowModal(false)
      fetchDoctors()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create doctor.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveFee = async () => {
    setFeeSaving(true)
    setError('')
    try {
      const doctorId = feeModal.id || feeModal._id
      await adminApi.patch(`/admin/doctors/${doctorId}`, {
        consultationFee: feeValue === '' ? null : feeValue,
      })
      setSuccess(feeValue === ''
        ? `Fee hidden for ${feeModal.full_name || feeModal.fullName}.`
        : `Fee updated for ${feeModal.full_name || feeModal.fullName}.`)
      setFeeModal(null)
      fetchDoctors()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update fee.')
    } finally {
      setFeeSaving(false)
    }
  }

  const handleToggle = async (doctorId, currentStatus) => {
    try {
      await adminApi.patch(`/admin/doctors/${doctorId}/toggle`)
      fetchDoctors()
    } catch (err) {
      alert('Failed to update doctor status.')
    }
  }

  const handleOpenSchedule = (doctor) => {
    setScheduleDoctor(doctor)
    setScheduleForm({ workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '09:00', endTime: '17:00', slotDurationMin: 15 })
    setShowScheduleModal(true)
    setError('')
  }

  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setScheduleSubmitting(true)
    try {
      const doctorId = scheduleDoctor.id || scheduleDoctor._id
      await adminApi.post(`/admin/doctors/${doctorId}/schedule`, scheduleForm)
      setSuccess(`Schedule updated for ${scheduleDoctor.full_name || scheduleDoctor.fullName}.`)
      setShowScheduleModal(false)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update schedule.')
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const toggleDay = (day) => {
    setScheduleForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Doctors</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage doctor accounts</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add doctor
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#15803d" strokeWidth="1.5" />
              <path d="M4 7l2 2 4-4" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {success}
          </div>
        )}

        {/* Doctors grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">👨‍⚕️</div>
            <p className="font-medium">No doctors yet</p>
            <p className="text-xs mt-1">Click "Add doctor" to create the first one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doctor, i) => (
              <div key={doctor.id || doctor._id}
                className="bg-white border border-gray-100 rounded-2xl p-5 animate-fade-up opacity-0"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-lg">
                    👨‍⚕️
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5
                    ${doctor.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${doctor.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900">{doctor.fullName || doctor.full_name}</h3>
                <p className="text-brand-600 text-xs font-medium mt-0.5">{doctor.specialization}</p>
                <p className="text-gray-400 text-xs mt-0.5">{doctor.qualification}</p>
                <p className="text-gray-400 text-xs mt-0.5">{doctor.email}</p>
                <p className="text-xs mt-1.5 font-semibold text-gray-700">
                  {doctor.consultation_fee != null
                    ? `₹${Number(doctor.consultation_fee).toLocaleString('en-IN')} consultation`
                    : <span className="font-normal text-gray-300">Fee not shown to patients</span>}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleOpenSchedule(doctor)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    ⏱ Set Schedule
                  </button>
                  <button
                    onClick={() => { setFeeModal(doctor); setFeeValue(doctor.consultation_fee != null ? String(doctor.consultation_fee) : '') }}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    ₹ Fee
                  </button>
                  <button
                    onClick={() => handleToggle(doctor.id || doctor._id, doctor.is_active)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition border
                      ${doctor.is_active
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                    {doctor.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-semibold text-gray-900">Add new doctor</h2>
              <button onClick={() => { setShowModal(false); setError('') }}
                className="text-gray-400 hover:text-gray-600 transition">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { key: 'fullName', label: 'Full name', placeholder: 'Anil Mehta', type: 'text', required: true },
                { key: 'email', label: 'Email', placeholder: 'doctor@clinic.com', type: 'email', required: true },
                { key: 'specialization', label: 'Specialization', placeholder: 'Cardiologist', type: 'text', required: true },
                { key: 'qualification', label: 'Qualification', placeholder: 'MBBS, MD (optional)', type: 'text' },
                { key: 'consultationFee', label: 'Consultation fee in ₹ (optional)', placeholder: 'e.g. 500 — leave empty to hide fees', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    min={field.type === 'number' ? 0 : undefined}
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    required={!!field.required}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              ))}

              {error && (
                <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setError('') }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                        <path d="M12 7a5 5 0 00-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Creating...
                    </>
                  ) : 'Create & send email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Set fee modal */}
      {feeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-up">
            <h2 className="text-lg font-display font-semibold text-gray-900 mb-1">Consultation fee</h2>
            <p className="text-gray-500 text-xs mb-4">
              For <strong>{feeModal.full_name || feeModal.fullName}</strong>. Shown to patients when set —
              leave empty to hide fees for this doctor.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-500 font-semibold">₹</span>
              <input
                type="number"
                min="0"
                autoFocus
                value={feeValue}
                onChange={e => setFeeValue(e.target.value)}
                placeholder="500"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFeeModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={handleSaveFee} disabled={feeSaving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
                {feeSaving ? 'Saving...' : feeValue === '' ? 'Hide fee' : 'Save fee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time credentials modal — temp password is not retrievable later */}
      {credentials && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
            <div className="mb-4">
              <h2 className="text-lg font-display font-semibold text-gray-900">Doctor credentials</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                For <strong>{credentials.fullName}</strong> — also emailed to {credentials.email}
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'loginUrl', label: 'Login URL (their clinic portal)', value: credentials.loginUrl },
                { key: 'email', label: 'Email', value: credentials.email },
                { key: 'tempPassword', label: 'Temporary password', value: credentials.tempPassword, mono: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <code className={`flex-1 truncate bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm ${f.mono ? 'font-semibold tracking-widest' : ''}`}>
                      {f.value}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(f.value)
                        setCopiedField(f.key)
                        setTimeout(() => setCopiedField(''), 1500)
                      }}
                      className="px-3 py-2.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition whitespace-nowrap">
                      {copiedField === f.key ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
              ⚠️ This password is shown only once. The doctor will be asked to change it on first login.
            </div>

            <button
              type="button"
              onClick={() => setCredentials(null)}
              className="mt-4 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition">
              Done — I've saved these
            </button>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-display font-semibold text-gray-900">Set Schedule</h2>
                <p className="text-gray-500 text-xs"> {scheduleDoctor?.fullName}</p>
              </div>
              <button onClick={() => { setShowScheduleModal(false); setError('') }}
                className="text-gray-400 hover:text-gray-600 transition">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${scheduleForm.workingDays.includes(day)
                        ? 'bg-brand-100 text-brand-700 border border-brand-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.startTime}
                    onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.endTime}
                    onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slot Duration (Mins)</label>
                <input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={scheduleForm.slotDurationMin}
                  onChange={e => setScheduleForm({ ...scheduleForm, slotDurationMin: parseInt(e.target.value, 10) })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowScheduleModal(false); setError('') }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={scheduleSubmitting}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {scheduleSubmitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
