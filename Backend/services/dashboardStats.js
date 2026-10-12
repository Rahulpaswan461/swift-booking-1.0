// Keep the RPC fast path, but support databases that have not applied migration
// 016. Only a missing function enables the fallback; outages/access errors must
// remain failures rather than misleading zero totals.
export function dashboardDates(now = new Date(), timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  const today = `${values.year}-${values.month}-${values.day}`
  const monday = new Date(`${today}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const weekStart = monday.toISOString().slice(0, 10)
  const end = new Date(monday)
  end.setUTCDate(end.getUTCDate() + 7)
  return { today, weekStart, weekEnd: end.toISOString().slice(0, 10) }
}

async function readPages(makeQuery) {
  const rows = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await makeQuery().order('id').range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}

export function createDashboardStats({ db, now = () => new Date(), onFallback = () => {} }) {
  let retryRpcAt = 0
  let fallbackNotified = false
  return async (clinicId, timeZone = 'Asia/Kolkata') => {
    if (!clinicId) throw new Error('Clinic context is required')
    const current = now()
    const { today, weekStart, weekEnd } = dashboardDates(current, timeZone)
    if (current.getTime() >= retryRpcAt) {
      const { data, error } = await db.rpc('clinic_dashboard_stats', {
        p_clinic_id: clinicId, p_today: today, p_week_start: weekStart,
      })
      if (!error) { fallbackNotified = false; return data }
      if (!['PGRST202', '42883'].includes(error.code)) throw error
      retryRpcAt = current.getTime() + 60_000
      if (!fallbackNotified) { onFallback(error.code); fallbackNotified = true }
    }
    // Select only aggregation metadata. No patient contacts or note content.
    // Stable paging avoids Supabase's 1,000-row cap and preserves clinic scope
    // on every page, including doctors with historical visits.
    const [appointments, doctors] = await Promise.all([
      readPages(() => db.from('appointments')
        .select('id, patient_id, doctor_id, appointment_date, status').eq('clinic_id', clinicId)),
      readPages(() => db.from('doctors')
        .select('id, full_name, specialization, is_active').eq('clinic_id', clinicId)),
    ])
    const result = {
      today: { total: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 },
      this_week: { total: 0, completed: 0, cancelled: 0 },
      all_time: { total_appointments: appointments.length, total_doctors: doctors.filter(d => d.is_active).length, total_patients: 0 },
      doctor_breakdown: [],
    }
    const patients = new Set(), byDoctor = new Map(), profiles = new Map(doctors.map(d => [d.id, d]))
    for (const appointment of appointments) {
      if (appointment.patient_id) patients.add(appointment.patient_id)
      const { status, appointment_date: date, doctor_id: doctorId } = appointment
      if (date >= weekStart && date < weekEnd) {
        result.this_week.total++
        if (status === 'completed' || status === 'cancelled') result.this_week[status]++
      }
      if (date !== today) continue
      result.today.total++
      if (Object.hasOwn(result.today, status) && status !== 'total') result.today[status]++
      if (!byDoctor.has(doctorId)) {
        const profile = profiles.get(doctorId)
        byDoctor.set(doctorId, { doctorName: profile?.full_name ?? null, specialization: profile?.specialization ?? null, total: 0, pending: 0, completed: 0, no_show: 0 })
      }
      const counts = byDoctor.get(doctorId)
      counts.total++
      if (status === 'confirmed') counts.pending++
      if (status === 'completed' || status === 'no_show') counts[status]++
    }
    result.all_time.total_patients = patients.size
    result.doctor_breakdown = [...byDoctor.values()].sort((a, b) => String(a.doctorName || '').localeCompare(String(b.doctorName || '')))
    return result
  }
}
