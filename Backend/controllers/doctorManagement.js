import supabase from "../config/supabase.js"
import bcrypt from "bcrypt"
import { sendWelcomeEmail } from "../services/emailService.js"
import { generateTempPassword } from "../utils/otpUtils.js"
import { buildClinicUrl } from "../utils/clinicUrl.js"

/**
 * Add a doctor under the logged-in admin's clinic.
 * Scoped to req.admin.clinic_id — never from request body.
 */
export const createDoctorForClinic = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id
    const { fullName, email, specialization, consultationFee } = req.body

    if (!fullName || !email || !specialization) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and specialization are required.",
      })
    }

    if (consultationFee !== undefined && consultationFee !== null && consultationFee !== "") {
      const fee = Number(consultationFee)
      if (Number.isNaN(fee) || fee < 0) {
        return res.status(400).json({
          success: false,
          message: "Consultation fee must be a positive number.",
        })
      }
    }

    // Fetch the clinic so the invite email carries the clinic's own login URL
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, slug")
      .eq("id", clinicId)
      .single()

    if (!clinic) {
      return res.status(404).json({ success: false, message: "Clinic not found." })
    }

    // Check if a doctor with this email already exists
    const { data: existing } = await supabase
      .from("doctors")
      .select("id")
      .eq("email", email)
      .single()

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this email already exists.",
      })
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    const insertData = {
      full_name: fullName,
      email,
      specialization,
      password: hashedPassword,
      clinic_id: clinicId,
      first_login: true,
      is_active: true,
    }
    const hasFee = consultationFee !== undefined && consultationFee !== null && consultationFee !== ""
    if (hasFee) insertData.consultation_fee = Number(consultationFee)

    let { data: doctor, error: createError } = await supabase
      .from("doctors")
      .insert(insertData)
      .select("id, full_name, email, specialization, is_active, clinic_id")
      .single()

    // Pre-migration-008 schema has no consultation_fee column — retry without
    if (createError && hasFee && /consultation_fee/i.test(createError.message || "")) {
      console.warn("consultation_fee column missing — run migration 008. Creating doctor without fee.")
      delete insertData.consultation_fee
      ;({ data: doctor, error: createError } = await supabase
        .from("doctors")
        .insert(insertData)
        .select("id, full_name, email, specialization, is_active, clinic_id")
        .single())
    }

    if (createError || !doctor) {
      console.error("Error creating doctor:", createError,'doctors response ', doctor)
      return res.status(500).json({ success: false, message: "Failed to create doctor." })
    }

    // Send credentials via email in the background — login URL is the
    // clinic's own subdomain; don't block the response on SMTP
    const loginUrl = buildClinicUrl(clinic.slug, "/doctor/login")
    sendWelcomeEmail({ doctor: { fullName, email }, tempPassword, clinic, loginUrl }).catch(
      (err) => console.error("Welcome email failed:", err.message)
    )

    return res.status(201).json({
      success: true,
      message: "Doctor added. Credentials have been sent to their email.",
      data: {
        id: doctor.id,
        fullName: doctor.full_name,
        email: doctor.email,
        specialization: doctor.specialization,
        is_active: doctor.is_active,
        // Returned ONCE so the admin can share it manually — never stored in plaintext
        temp_password: tempPassword,
        login_url: loginUrl,
      },
    })
  } catch (error) {
    console.error("createDoctorForClinic error:", error.stack)
    return res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}

/**
 * List all doctors for the logged-in admin's clinic.
 * Scoped to req.admin.clinic_id. select("*") + whitelist so optional
 * columns (consultation_fee) work with or without migration 008.
 */
export const listDoctorsForClinic = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id

    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return res.status(200).json({
      success: true,
      data: (doctors || []).map((d) => ({
        id: d.id,
        full_name: d.full_name,
        fullName: d.full_name,
        email: d.email,
        specialization: d.specialization,
        qualification: d.qualification,
        consultation_fee: d.consultation_fee ?? null,
        is_active: d.is_active,
        created_at: d.created_at,
      })),
    })
  } catch (error) {
    console.error("listDoctorsForClinic error:", error.stack)
    return res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}

/**
 * Update a doctor's details (fee, specialization, qualification).
 * Scoped to req.admin.clinic_id — never trusts the body for clinic.
 */
export const updateDoctorForClinic = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id
    const { id } = req.params
    const { fullName, specialization, qualification, consultationFee } = req.body

    // Ownership check
    const { data: existing } = await supabase
      .from("doctors")
      .select("id, clinic_id")
      .eq("id", id)
      .single()

    if (!existing || existing.clinic_id !== clinicId) {
      return res.status(404).json({ success: false, message: "Doctor not found at your clinic." })
    }

    const updateData = {}
    if (fullName) updateData.full_name = fullName
    if (specialization) updateData.specialization = specialization
    if (qualification !== undefined) updateData.qualification = qualification

    if (consultationFee !== undefined) {
      if (consultationFee === null || consultationFee === "") {
        updateData.consultation_fee = null // clinic disabled the fee display
      } else {
        const fee = Number(consultationFee)
        if (Number.isNaN(fee) || fee < 0) {
          return res.status(400).json({ success: false, message: "Consultation fee must be a positive number." })
        }
        updateData.consultation_fee = fee
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update." })
    }

    const { data: doctor, error } = await supabase
      .from("doctors")
      .update(updateData)
      .eq("id", id)
      .eq("clinic_id", clinicId)
      .select("id, full_name, specialization, qualification, is_active")
      .single()

    if (error) {
      if (/consultation_fee/i.test(error.message || "")) {
        return res.status(400).json({
          success: false,
          message: "Fee support needs a database update — run migration 008 in Supabase, then try again.",
        })
      }
      throw error
    }

    return res.status(200).json({ success: true, data: doctor })
  } catch (error) {
    console.error("updateDoctorForClinic error:", error.stack)
    return res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}
