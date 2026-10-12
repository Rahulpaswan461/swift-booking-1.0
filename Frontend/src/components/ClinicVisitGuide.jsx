import { useId, useState } from 'react';

const steps = [
  { title: 'Find your doctor', hint: 'A little clarity before you choose', detail: 'Compare specialties, qualifications and consultation fees. Choose the doctor you would like to see.', icon: 'doctor', action: 'Explore our doctors', points: ['Compare the clinic’s doctor profiles', 'Review fees provided by the clinic', 'Regular consultation days and hours'] },
  { title: 'Choose your time', hint: 'A visit that fits your day', detail: 'Verify your email with a one-time code, then choose from the available appointment dates and times.', icon: 'calendar', action: 'Start your booking', points: ['No password to remember', 'Available slots shown for your selected date', 'Review your details before confirming'] },
  { title: 'Arrive prepared', hint: 'Know what happens next', detail: 'Save your appointment confirmation. Keep the doctor, date and time handy, along with any records you want to discuss.', icon: 'check', action: 'Book an appointment', points: ['Your visit details together in one confirmation', 'Manage your booking through the provided links', 'Bring relevant reports and prescriptions'] },
];
const faqs = [
  ['Do I need an account to book?', 'You only need to verify your email with a one-time code. There is no password to create or app to install. Choose a doctor, select an available time, and review your details before confirming.'],
  ['Where can I see the consultation fee?', 'The consultation fee is listed on the doctor’s card when the clinic has provided it. You can review it again on the booking page. Contact the clinic about any additional services or charges.'],
  ['Are the listed doctor hours always available?', 'These are the doctor’s regular consultation hours. The booking page shows appointment slots for your chosen date. A slot can become unavailable if another patient books it first.'],
  ['How can I reschedule or cancel?', 'Use the appointment management links provided with your confirmation. A new time depends on available slots. If you need help, contact the clinic directly.'],
  ['What should I bring to my visit?', 'Keep your appointment confirmation handy. Bring any previous reports, prescriptions, or records you want to discuss with your doctor. Check with the clinic if your visit needs specific preparation.'],
];
function Icon({ name }) {
  const paths = {
    doctor: <><path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4M10 12v3a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="10" r="2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 5 3 2 5-4" /></>,
    check: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 7h6m-7 7 3 3 5-6" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function timeLabel(value) {
  if (!/^\d{1,2}:\d{2}/.test(value || '')) return '';
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Used by both the public page and the clinic branding preview. */
export default function ClinicVisitGuide({ clinic = {}, clinicName, onBook, preview = false }) {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState([]);
  const id = useId();
  const current = steps[step];
  const hours = clinic.operating_hours || {};
  const days = Array.isArray(hours.days) ? hours.days : [];
  const open = timeLabel(hours.open);
  const close = timeLabel(hours.close);
  const list = ['Save my appointment confirmation', 'Gather previous reports & prescriptions', 'Check the clinic location and my visit time'];
  const directions = clinic.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinicName} ${clinic.address}`)}` : null;

  return <div className={`clinic-visit-guide${preview ? ' clinic-guide-preview' : ''}`}>
    <section className="visit-walkthrough" aria-labelledby={`${id}-title`}>
      <div className="visit-container">
        <div className="visit-section-heading"><div><p className="clinic-eyebrow">Your visit, made simpler</p><h2 id={`${id}-title`}>A clear next step.<br /><span>From booking to your visit.</span></h2></div><p>New here? Explore the steps below so you know exactly what to expect.</p></div>
        <div className="visit-walkthrough-grid">
          <div className="visit-step-list" aria-label="Explore the booking steps">{steps.map((item, index) => <button key={item.title} type="button" aria-pressed={step === index} aria-controls={`${id}-step-detail`} onClick={() => setStep(index)}><span className="visit-step-number">0{index + 1}</span><span><strong>{item.title}</strong><small>{item.hint}</small></span><Icon name="arrow" /></button>)}</div>
          <div className="visit-step-detail" id={`${id}-step-detail`} aria-live="polite" aria-atomic="true"><div key={step} className="patient-enter"><span className="visit-detail-icon"><Icon name={current.icon} /></span><p className="visit-step-count">STEP {step + 1} OF 3</p><h3>{current.title}</h3><p className="visit-detail-copy">{current.detail}</p><ul>{current.points.map(point => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul>{step === 0 ? <a href={preview ? undefined : '#doctors'} onClick={preview ? event => event.preventDefault() : undefined} aria-disabled={preview} className="clinic-text-link">{current.action}<Icon name="arrow" /></a> : <button type="button" onClick={onBook} disabled={preview} className="clinic-text-link">{current.action}<Icon name="arrow" /></button>}</div></div>
        </div>
      </div>
    </section>
    <section className="visit-plan visit-container" id={preview ? undefined : 'plan-your-visit'} aria-labelledby={`${id}-plan-title`}>
      <div className="visit-section-heading"><div><p className="clinic-eyebrow">Before you set off</p><h2 id={`${id}-plan-title`}>Feel ready for your visit.</h2></div><p>Your clinic details and a handy checklist, together in one place.</p></div>
      <div className="visit-plan-grid">
        <div className="visit-location-card"><span className="visit-card-label"><Icon name="pin" />Visiting the clinic</span><h3>{clinicName}</h3>{clinic.address ? <p className="visit-address">{clinic.address}</p> : <p className="visit-address">Please confirm the clinic address before travelling.</p>}
          <div className="visit-hours"><Icon name="clock" /><div><strong>Clinic hours</strong>{days.length > 0 && <p>{days.join(' · ')}</p>}{open && close ? <p>{open} – {close}</p> : <p>Contact the clinic to confirm opening hours.</p>}<small>Your doctor’s appointment times may differ.</small></div></div>
          {directions && <a className="visit-directions" href={directions} target="_blank" rel="noopener noreferrer">Get directions <Icon name="arrow" /><span className="sr-only"> (opens Google Maps in a new tab)</span></a>}
        </div>
        <div className="visit-checklist"><div className="visit-checklist-heading"><h3>A little preparation helps.</h3><span aria-live="polite">{checked.length} of {list.length} ready</span></div><p>Tick these off as you get ready. This list is just for you.</p><div className="visit-progress" aria-hidden="true"><span style={{ width: `${checked.length / list.length * 100}%` }} /></div><fieldset><legend className="sr-only">Prepare for your visit</legend>{list.map((item, index) => <label key={item}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked(previous => previous.includes(index) ? previous.filter(value => value !== index) : [...previous, index])} /><span>{item}</span></label>)}</fieldset><p className="visit-checklist-note">{checked.length === list.length ? 'Your checklist is complete. Keep your confirmation handy for your visit.' : 'Your checks stay on this page and are not sent to the clinic.'}</p></div>
      </div>
    </section>
    <section className="visit-questions visit-container" aria-labelledby={`${id}-questions-title`}><div className="visit-questions-intro"><p className="clinic-eyebrow">Here to help</p><h2 id={`${id}-questions-title`}>A few things you <br />might be wondering.</h2><p>Simple answers before you make your appointment.</p><button type="button" onClick={onBook} disabled={preview} className="clinic-primary">Book a visit <Icon name="arrow" /></button><small>Choose a doctor and review the available times.</small></div><div className="visit-faq-list">{faqs.map(([question, answer], index) => <details key={question} name={`${id}-faq`} open={index === 0 ? true : undefined}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <div className="visit-closing visit-container"><Icon name="calendar" /><p><strong>Your next visit starts with a clear choice.</strong><span>Meet the doctors, check the details, and choose a time that works for you.</span></p><a href={preview ? undefined : '#doctors'} aria-disabled={preview} className="clinic-text-link">Meet our doctors <Icon name="arrow" /></a></div>
  </div>;
}
