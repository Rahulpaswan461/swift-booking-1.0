import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'

const localDay = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const parseDay = value => new Date(`${value}T12:00:00`)
const displayDate = value => parseDay(value).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
const displayTime = value => { const [h,m] = value.split(':').map(Number); return `${h%12 || 12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
const displayDoctor = value => /^dr\.?\s/i.test(value || '') ? value : `Dr. ${value || 'Doctor'}`

export default function BookAppointment() {
  const { doctorId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(state?.doctor?.id === doctorId ? state.doctor : null)
  const [doctorError, setDoctorError] = useState('')
  const [doctorAttempt, setDoctorAttempt] = useState(0)
  const contactValue = localStorage.getItem('otp_contact') || ''
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [slotAttempt, setSlotAttempt] = useState(0)
  const [form, setForm] = useState({ fullName:'', phone:'', date_of_birth:'', notes:'' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const days = Array.from({ length:14 },(_,i) => { const d = new Date(); d.setDate(d.getDate()+i+1); return localDay(d) })

  useEffect(() => {
    if (!contactValue || !localStorage.getItem('patient_id')) navigate('/verify', { replace:true })
  }, [contactValue, navigate])
  // A reload or a homepage doctor link must resolve the doctor without losing
  // the booking route simply because navigation state is absent.
  useEffect(() => {
    if (state?.doctor?.id === doctorId) { setDoctor(state.doctor); return }
    const controller = new AbortController()
    setDoctorError('')
    api.get('/doctors', { signal:controller.signal, timeout:30000 }).then(res => {
      const records = res.data.data || res.data
      const match = records.find(item => String(item.id || item._id) === doctorId && item.is_active)
      if (!controller.signal.aborted) { setDoctor(match || null); if (!match) setDoctorError('This doctor is no longer available for online booking. Please choose another doctor.') }
    }).catch(err => { if (err.code !== 'ERR_CANCELED') setDoctorError('We could not load this doctor. Please try again.') })
    return () => controller.abort()
  }, [doctorId, doctorAttempt, state?.doctor])
  useEffect(() => {
    if (!selectedDate) return
    const controller = new AbortController()
    setSlotsLoading(true); setSlotError(''); setSelectedSlot(''); setSlots([])
    api.get(`/doctors/${doctorId}/slots`, { params:{ date:selectedDate }, signal:controller.signal, timeout:30000 })
      .then(res => { if (!controller.signal.aborted) setSlots(res.data.availableSlots || []) })
      .catch(err => { if (!controller.signal.aborted) setSlotError(err.response?.data?.message || 'We could not load appointment times. Please try again.') })
      .finally(() => { if (!controller.signal.aborted) setSlotsLoading(false) })
    return () => controller.abort()
  }, [doctorId, selectedDate, slotAttempt])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  const selectDate = day => { setSelectedSlot(''); setSlots([]); setSlotError(''); setSlotsLoading(true); setSelectedDate(day); setError('') }
  const handleSubmit = async event => {
    event.preventDefault()
    if (!selectedDate || !selectedSlot || slotsLoading || !slots.includes(selectedSlot)) { setError('Choose an available date and time before confirming.'); return }
    setError(''); setSubmitting(true)
    try {
      const res = await api.post('/appointments/book', { fullName:form.fullName.trim(), phone:form.phone.trim(), date_of_birth:form.date_of_birth, notes:form.notes.trim(), doctor_id:doctorId, appointment_date:selectedDate, appointment_time:selectedSlot })
      navigate('/confirmation', { state:{ appointment:res.data.data, doctor } })
    } catch (err) {
      setError(err.response?.data?.message || 'Your appointment could not be confirmed. Please try again.')
      if (err.response?.status === 409) { setSelectedSlot(''); setSlotAttempt(value => value+1) }
    } finally { setSubmitting(false) }
  }
  const name = displayDoctor(doctor?.fullName || doctor?.full_name)
  const grouped = slots.reduce((groups,slot) => { const h = Number(slot.split(':')[0]); const group = h<12?'Morning':h<17?'Afternoon':'Evening'; (groups[group] ||= []).push(slot); return groups }, {})
  const hasFee = doctor?.consultation_fee != null && doctor.consultation_fee !== '' && Number.isFinite(Number(doctor.consultation_fee))

  return <div className="patient-booking">
    <header className="patient-header"><Logo showClinicName /><button className="patient-back" onClick={() => navigate('/doctors')}>Change doctor</button></header>
    <main className="booking-main">
      <StepIndicator current={3} />
      <div className="booking-title"><h1>Choose a time for your visit.</h1><p>Select a date, add your details, and review everything before you confirm.</p></div>
      {!doctor ? <div className="booking-card" role={doctorError ? 'alert' : 'status'}>{doctorError || 'Loading doctor details…'}{doctorError && <button type="button" className="booking-change ml-3" onClick={() => setDoctorAttempt(n=>n+1)}>Try again</button>}</div> : <form className="booking-layout" onSubmit={handleSubmit}>
        <div className="booking-sections">
          <section className="booking-card patient-enter" aria-labelledby="booking-date-title">
            <h2 id="booking-date-title"><span className="booking-number">1</span>Date & time</h2>
            <p className="booking-hint">Appointments over the next 14 days. Choose a date to see available times.</p>
            <div className="booking-date-grid" aria-label="Choose appointment date">{days.map(day => { const date=parseDay(day); return <button type="button" key={day} className="booking-date" aria-pressed={selectedDate===day} aria-label={displayDate(day)} onClick={() => day !== selectedDate && selectDate(day)}><span>{date.toLocaleDateString('en-IN',{weekday:'short'})}</span><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('en-IN',{month:'short'})}</span></button> })}</div>
            <div className="booking-time-section" aria-busy={slotsLoading}>
              <h3>{selectedDate ? `Available times · ${displayDate(selectedDate)}` : 'Choose a date above to get started'}</h3>
              {!selectedDate ? <p className="booking-empty">Available appointment times will appear here.</p> : slotsLoading ? <p role="status" className="booking-empty">Checking available times…</p> : slotError ? <div role="alert" className="booking-empty"><p>{slotError}</p><button className="booking-change" type="button" onClick={() => setSlotAttempt(n=>n+1)}>Retry available times</button></div> : !slots.length ? <div role="status" className="booking-empty"><strong>No times available on this date.</strong><p>Please choose another date above.</p></div> : <div className="patient-enter">{Object.entries(grouped).map(([group,times]) => <div key={group} className="mt-5"><p className="booking-meta">{group}</p><div className="booking-time-group">{times.map(slot => <button type="button" className="booking-time" aria-pressed={selectedSlot===slot} key={slot} onClick={() => {setSelectedSlot(slot);setError('')}}>{displayTime(slot)}</button>)}</div></div>)}</div>}
            </div>
          </section>
          <section className="booking-card" aria-labelledby="booking-details-title">
            <h2 id="booking-details-title"><span className="booking-number">2</span>Patient details</h2><p className="booking-hint">Enter the details of the person visiting the clinic.</p>
            <div className="booking-fields">
              <div className="booking-field-row"><div><label htmlFor="patient-name">Full name</label><input id="patient-name" name="name" autoComplete="name" required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Patient’s full name" /></div><div><label htmlFor="patient-phone">Phone number</label><input id="patient-phone" name="tel" type="tel" autoComplete="tel" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone number with country code" /></div></div>
              <div className="booking-field-row"><div><label htmlFor="patient-contact">Verified {localStorage.getItem('otp_contact_type')==='phone'?'phone':'email'}</label><input id="patient-contact" value={contactValue} readOnly /><p className="booking-hint">Used for your appointment confirmation.</p></div><div><label htmlFor="patient-dob">Date of birth <span>(optional)</span></label><input id="patient-dob" type="date" autoComplete="bday" max={localDay(new Date())} value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})} /></div></div>
              <div><label htmlFor="patient-notes">Reason for visit <span>(optional)</span></label><textarea id="patient-notes" rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Anything you’d like the doctor to know before your visit" /></div>
            </div>
          </section>
        </div>
        <aside className="booking-card booking-summary" aria-labelledby="booking-review-title">
          <div className="booking-summary-head"><p className="clinic-eyebrow" style={{marginBottom:8}}>Your visit</p><h2 id="booking-review-title">Review & confirm</h2></div>
          <div className="booking-summary-body"><p className="booking-doctor">{name}</p><p className="booking-meta">{doctor.specialization}</p>{doctor.qualification && <p className="booking-meta">{doctor.qualification}</p>}<button type="button" onClick={() => navigate('/doctors')} className="booking-change">Choose a different doctor</button>
            <dl aria-live="polite" aria-atomic="true"><div><dt>Date</dt><dd>{selectedDate ? displayDate(selectedDate) : 'Select a date'}</dd></div><div><dt>Time</dt><dd>{selectedSlot ? displayTime(selectedSlot) : 'Select an available time'}</dd></div><div><dt>Consultation fee</dt><dd>{hasFee ? `₹${Number(doctor.consultation_fee).toLocaleString('en-IN')}` : 'Confirm with the clinic'}</dd></div></dl>
            {error && <p ref={errorRef} tabIndex={-1} role="alert" className="booking-error">{error}</p>}
            <button className="clinic-primary" type="submit" disabled={submitting || !selectedSlot || slotsLoading}>{submitting ? 'Confirming…' : 'Confirm appointment'}</button>
            <p className="booking-review-note">{!selectedSlot ? 'Choose your date and time, then complete your details to confirm.' : 'Please check your doctor, date, and time. Your appointment is booked only after confirmation.'}</p>
          </div>
        </aside>
      </form>}
    </main>
  </div>
}
