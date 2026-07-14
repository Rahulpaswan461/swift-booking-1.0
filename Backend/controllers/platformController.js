import supabase from "../config/supabase.js"

// Free-tier thresholds — clinics exceeding these during Early Access
// are the ones consuming what will later be paid ("upgrade-ready").
const FREE_MAX_DOCTORS = 1
const FREE_MAX_BOOKINGS_30D = 50

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * Founder-level platform metrics. Not clinic-scoped — protected by a
 * shared secret (INTERNAL_METRICS_KEY), never by clinic auth.
 */
export async function computePlatformMetrics() {
  const now = new Date()
  const d7 = new Date(now); d7.setDate(now.getDate() - 7)
  const d30 = new Date(now); d30.setDate(now.getDate() - 30)

  const [{ data: clinics }, { data: doctors }, { data: appointments }, { count: patientCount }] =
    await Promise.all([
      supabase.from("clinics").select("id, name, slug, created_at, branding, is_active"),
      supabase.from("doctors").select("id, clinic_id, is_active"),
      // created_at = when the booking was made (activity signal)
      supabase.from("appointments").select("clinic_id, created_at, status"),
      supabase.from("patients").select("*", { count: "exact", head: true }),
    ])

  const perClinic = (clinics || []).map((c) => {
    const clinicDoctors = (doctors || []).filter((d) => d.clinic_id === c.id && d.is_active)
    const clinicAppts = (appointments || []).filter((a) => a.clinic_id === c.id)
    const bookings7d = clinicAppts.filter((a) => new Date(a.created_at) >= d7).length
    const bookings30d = clinicAppts.filter((a) => new Date(a.created_at) >= d30).length
    const lastBooking = clinicAppts.length
      ? clinicAppts.reduce((m, a) => (a.created_at > m ? a.created_at : m), clinicAppts[0].created_at)
      : null
    const brandingCustomized = !!(c.branding && (c.branding.primary_color || c.branding.logo_url || c.branding.tagline))

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      created_at: c.created_at,
      is_active: c.is_active,
      doctors: clinicDoctors.length,
      bookings_7d: bookings7d,
      bookings_30d: bookings30d,
      bookings_total: clinicAppts.length,
      last_booking_at: lastBooking,
      branding_customized: brandingCustomized,
      // The money metric: would this clinic exceed the free tier?
      upgrade_ready:
        clinicDoctors.length > FREE_MAX_DOCTORS || bookings30d > FREE_MAX_BOOKINGS_30D,
    }
  }).sort((a, b) => b.bookings_30d - a.bookings_30d)

  return {
    generated_at: now.toISOString(),
    date: localDateStr(now),
    totals: {
      clinics: perClinic.length,
      new_clinics_7d: perClinic.filter((c) => new Date(c.created_at) >= d7).length,
      active_clinics_7d: perClinic.filter((c) => c.bookings_7d > 0).length,
      upgrade_ready_clinics: perClinic.filter((c) => c.upgrade_ready).length,
      bookings_7d: perClinic.reduce((s, c) => s + c.bookings_7d, 0),
      bookings_30d: perClinic.reduce((s, c) => s + c.bookings_30d, 0),
      total_patients: patientCount || 0,
    },
    clinics: perClinic,
  }
}

export const getPlatformMetrics = async (req, res) => {
  try {
    const configuredKey = process.env.INTERNAL_METRICS_KEY
    if (!configuredKey) {
      return res.status(404).json({ success: false, message: "Not found" })
    }

    const providedKey = req.headers["x-internal-key"] || req.query.key
    if (providedKey !== configuredKey) {
      return res.status(401).json({ success: false, message: "Invalid key" })
    }

    const metrics = await computePlatformMetrics()
    return res.status(200).json({ success: true, data: metrics })
  } catch (error) {
    console.error("getPlatformMetrics error:", error)
    return res.status(500).json({ success: false, message: "Internal server error." })
  }
}
