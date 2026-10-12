import { emailLookup } from '../utils/emailLookup.js'
import supabase from "../config/supabase.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { buildClinicUrl } from "../utils/clinicUrl.js"
import { EARLY_ACCESS } from "../middleware/tenant.js"
import { createDashboardStats } from '../services/dashboardStats.js'

const loadDashboardStats = createDashboardStats({
    db: supabase,
    onFallback: code => console.warn(`Dashboard statistics RPC unavailable (${code}); using scoped table reads. Apply migration 016 to enable database aggregation.`),
})

export const adminlogin = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            })
        }

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .ilike('email', emailLookup(email))
            .single()

        if (error || !admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            })
        }

        const isMatch = await bcrypt.compare(password, admin.password)
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            })
        }

        // Fetch clinic info
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id, name, slug, trial_ends_at')
            .eq('id', admin.clinic_id)
            .single()

        const token = jwt.sign(
            { id: admin.id, role: 'admin', email: admin.email, clinic_id: admin.clinic_id },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        )

        return res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                fullName: admin.full_name,
                email: admin.email,
                clinic_id: admin.clinic_id,
                clinicName: clinic?.name,
                clinicSlug: clinic?.slug,
                clinicUrl: clinic?.slug ? buildClinicUrl(clinic.slug) : null,
                trialEndsAt: clinic?.trial_ends_at,
                earlyAccess: EARLY_ACCESS
            }
        })

    }
    catch (error) {
        console.error('adminLogin error:', error)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}

export const getAllAppointments = async (req, res) => {
    try {
        const clinicId = req.admin.clinic_id
        const { date, doctor, status } = req.query

        // Build query filters — always scoped to admin's clinic
        let query = supabase
            .from('appointments')
            .select(`
                id, appointment_date, appointment_time, status, notes, created_at,
                patients (name, email, phone),
                doctors  (full_name, specialization)
            `)
            .eq('clinic_id', clinicId)

        if (date) {
            query = query.eq('appointment_date', date)
        } else {
            const today = new Date().toISOString().split('T')[0]
            query = query.eq('appointment_date', today)
        }

        if (doctor) {
            query = query.eq('doctor_id', doctor)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data: appointments, error } = await query.order('appointment_date', { ascending: false })

        if (error) throw error

        const total = appointments.length
        const confirmed = appointments.filter(a => a.status === 'confirmed').length
        const completed = appointments.filter(a => a.status === 'completed').length
        const cancelled = appointments.filter(a => a.status === 'cancelled').length
        const no_show = appointments.filter(a => a.status === 'no_show').length

        return res.status(200).json({
            success: true,
            summary: { total, confirmed, completed, cancelled, no_show },
            data: appointments.map(a => ({
                id: a.id,
                patient: {
                    name: a.patients?.name,
                    email: a.patients?.email,
                    phone: a.patients?.phone,
                },
                doctor: {
                    name: a.doctors?.full_name,
                    specialization: a.doctors?.specialization,
                },
                appointment_date: a.appointment_date,
                appointment_time: a.appointment_time,
                status: a.status,
                notes: a.notes,
                created_at: a.created_at,
            }))
        })

    }
    catch (error) {
        console.error("Error while getting appointments: ", error.stack)
        return res.status(500).json({ success: false, message: "Internal Server Error !!" })
    }
}

export const getStats = async (req, res) => {
    try {
        const clinicId = req.admin.clinic_id
        const data = await loadDashboardStats(clinicId, process.env.DASHBOARD_TZ || process.env.REMINDER_TZ || 'Asia/Kolkata')
        res.set('Cache-Control', 'no-store')
        return res.status(200).json({ success: true, data })

    } catch (err) {
        console.error('getStats error:', err)
        return res.status(503).json({ success: false, message: 'Clinic totals are temporarily unavailable. Please retry shortly.' })
    }
}

export const toggleDoctor = async (req, res) => {
    try {
        const clinicId = req.admin.clinic_id
        const { id } = req.params

        // Get current doctor — must belong to admin's clinic
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('is_active, clinic_id')
            .eq('id', id)
            .single()

        if (fetchError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' })
        }

        if (doctor.clinic_id !== clinicId) {
            return res.status(403).json({ success: false, message: 'Doctor does not belong to your clinic' })
        }

        // Toggle and update
        const { data: updated, error: updateError } = await supabase
            .from('doctors')
            .update({ is_active: !doctor.is_active })
            .eq('id', id)
            .eq('clinic_id', clinicId)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json({ success: true, data: updated })
    } catch (error) {
        console.error('toggleDoctor error:', error)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}
