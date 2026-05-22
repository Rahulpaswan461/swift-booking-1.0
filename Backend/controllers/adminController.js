import supabase from "../config/supabase.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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
            .eq('email', email)
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

        const token = jwt.sign(
            { id: admin.id, role: 'admin', email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        )

        return res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                fullName: admin.full_name,
                email: admin.email
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
        const { date, doctor, status } = req.query

        // Build query filters
        let query = supabase
            .from('appointments')
            .select(`
                *,
                patients (full_name, email, phone),
                doctors  (full_name, specialization)
            `)

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
                    name: a.patients?.full_name,
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
        const today = new Date().toISOString().split('T')[0]

        // Get start of current week (Monday)
        const now = new Date()
        const dayOfWeek = now.getDay() || 7
        const monday = new Date(now)
        monday.setDate(now.getDate() - dayOfWeek + 1)
        const weekStart = monday.toISOString().split('T')[0]

        // Fetch all data in parallel
        const [
            { data: todayAppointments },
            { data: weekAppointments },
            { count: totalAppointmentsCount },
            { count: totalDoctorsCount },
            { data: patientIds }
        ] = await Promise.all([
            // Today
            supabase
                .from('appointments')
                .select('*')
                .eq('appointment_date', today),

            // This week
            supabase
                .from('appointments')
                .select('*')
                .gte('appointment_date', weekStart),

            // All time count
            supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true }),

            // Active doctors count
            supabase
                .from('doctors')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true),

            // Unique patients (distinct)
            supabase
                .from('appointments')
                .select('patient_id')
        ])

        const uniquePatients = new Set(patientIds?.map(r => r.patient_id) || [])

        // Get doctor breakdown for today with joins
        const { data: doctorBreakdownData } = await supabase
            .from('appointments')
            .select(`
                doctor_id,
                status,
                doctors (full_name, specialization)
            `)
            .eq('appointment_date', today)

        // Process doctor breakdown
        const doctorBreakdownMap = {}
        doctorBreakdownData?.forEach(appt => {
            if (!doctorBreakdownMap[appt.doctor_id]) {
                doctorBreakdownMap[appt.doctor_id] = {
                    doctorName: appt.doctors?.full_name,
                    specialization: appt.doctors?.specialization,
                    total: 0,
                    completed: 0,
                    pending: 0,
                    no_show: 0
                }
            }
            doctorBreakdownMap[appt.doctor_id].total += 1
            if (appt.status === 'completed') doctorBreakdownMap[appt.doctor_id].completed += 1
            if (appt.status === 'confirmed') doctorBreakdownMap[appt.doctor_id].pending += 1
            if (appt.status === 'no_show') doctorBreakdownMap[appt.doctor_id].no_show += 1
        })

        const doctorBreakdown = Object.values(doctorBreakdownMap)

        return res.status(200).json({
            success: true,
            data: {
                today: {
                    total: todayAppointments?.length || 0,
                    confirmed: todayAppointments?.filter(a => a.status === 'confirmed').length || 0,
                    completed: todayAppointments?.filter(a => a.status === 'completed').length || 0,
                    cancelled: todayAppointments?.filter(a => a.status === 'cancelled').length || 0,
                    no_show: todayAppointments?.filter(a => a.status === 'no_show').length || 0,
                },
                this_week: {
                    total: weekAppointments?.length || 0,
                    completed: weekAppointments?.filter(a => a.status === 'completed').length || 0,
                    cancelled: weekAppointments?.filter(a => a.status === 'cancelled').length || 0,
                },
                all_time: {
                    total_appointments: totalAppointmentsCount || 0,
                    total_doctors: totalDoctorsCount || 0,
                    total_patients: uniquePatients.size,
                },
                doctor_breakdown: doctorBreakdown,
            }
        })

    } catch (err) {
        console.error('getStats error:', err)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}

export const toggleDoctor = async (req, res) => {
    try {
        const { id } = req.params

        // Get current doctor
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('is_active')
            .eq('id', id)
            .single()

        if (fetchError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' })
        }

        // Toggle and update
        const { data: updated, error: updateError } = await supabase
            .from('doctors')
            .update({ is_active: !doctor.is_active })
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json({ success: true, data: updated })
    } catch (error) {
        console.error('toggleDoctor error:', error)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}