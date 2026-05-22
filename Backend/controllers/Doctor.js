import supabase from "../config/supabase.js"
import jwt from "jsonwebtoken"
import { sendWelcomeEmail } from "../services/emailService.js"
import { generateTempPassword } from "../utils/otpUtils.js"
import bcrypt from 'bcrypt'

export const createDoctor = async (req, res) => {
    try {
        const { fullName, email, specialization, qualification } = req.body;

        if (!fullName || !email || !specialization) {
            return res.status(400).json({
                success: false,
                message: 'Fullname, email and specialization are required.'
            })
        }

        // Check if doctor already exists
        const { data: existing, error: checkError } = await supabase
            .from('doctors')
            .select('id')
            .eq('email', email)
            .single()

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A doctor with this email already exists.'
            })
        }

        const tempPassword = generateTempPassword()
        const hashedPassword = await bcrypt.hash(tempPassword, 12)

        const { data: doctor, error: createError } = await supabase
            .from('doctors')
            .insert({
                full_name: fullName,
                email,
                specialization,
                qualification,
                password: hashedPassword,
                first_login: true,
                is_active: true
            })
            .select('id, full_name, email, specialization, qualification, is_active')
            .single()

        if (createError || !doctor) {
            console.error("Error creating doctor:", createError)
            return res.status(400).json({ success: false, message: 'Failed to create doctor.' })
        }

        await sendWelcomeEmail({ doctor: { fullName, email }, tempPassword }).catch(err =>
            console.error("Welcome email failed: ", err.message)
        )

        return res.status(201).json({
            success: true,
            message: 'Doctor account created. Credentials have been sent to email.',
            data: {
                id: doctor.id,
                fullName: doctor.full_name,
                email: doctor.email,
                specialization: doctor.specialization,
                qualification: doctor.qualification,
                is_active: doctor.is_active,
            }
        })
    }
    catch (error) {
        console.log("Error while creating doctor", error.stack)
        return res.status(500).json({ success: false, message: "Internal Server Error !" })
    }
}

export const doctorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email, password is required !!" })
        }

        // Fetch doctor with password
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('*')
            .eq('email', email)
            .single()

        console.log("doctor response for the first login: ", doctor)

        if (error || !doctor) {
            return res.status(401).json({ success: false, message: "Invalid email or password" })
        }

        if (!doctor.is_active) {
            return res.status(403).json({ success: false, message: "Your account has been deactivated. Contact admin." })
        }

        const isMatch = await bcrypt.compare(password, doctor.password)

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email or password" })
        }

        const token = jwt.sign(
            { id: doctor.id, role: 'doctor', email: doctor.email },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        )

        return res.status(200).json({
            success: true,
            token,
            first_login: doctor.first_login,
            doctor: {
                id: doctor.id,
                fullName: doctor.full_name,
                email: doctor.email,
                specialization: doctor.specialization,
                qualification: doctor.qualification
            }
        })
    }
    catch (error) {
        console.error("Error while login the doctor", error.stack)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const doctorId = req.doctor.id

        console.log("request doctor: ", req.doctor)

        // 1. Validate inputs
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required.'
            })
        }

        // 2. Basic password strength check
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.'
            })
        }

        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter and one number.'
            })
        }

        // 3. Fetch doctor with password
        const { data: doctor, error: fetchError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', doctorId)
            .single()

        if (fetchError || !doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' })
        }

        console.log("doctor response: ", doctor)

        // 4. Verify current password is correct
        const isMatch = await bcrypt.compare(currentPassword, doctor.password)
        console.log("isMatch: ", isMatch)
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect.'
            })
        }

        // 5. Make sure new password is different from current
        const isSame = await bcrypt.compare(newPassword, doctor.password)
        if (isSame) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.'
            })
        }

        // 6. Hash new password + update
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        const { data: updatedDoctor, error: updateError } = await supabase
            .from('doctors')
            .update({
                password: hashedPassword,
                first_login: false
            })
            .eq('id', doctorId)
            .select()
            .single()

        if (updateError) throw updateError

        console.log("updated doctor: ", updatedDoctor)
        console.log("executed the code: ")
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully. You can now access your dashboard.',
        })

    } catch (err) {
        console.error('changePassword error:', err)
        return res.status(500).json({ success: false, message: 'Server error.' })
    }
}

export const getDoctor = async (req, res) => {
    try {
        console.log("route called ")
        const { email } = req.query;

        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('id, full_name, email, specialization, qualification, is_active')
            .eq('email', email)
            .single()

        if (error || !doctor) {
            return res.status(400).json({ success: false, message: "Doctor not found" })
        }

        return res.status(200).json({ message: "Doctor found", data: doctor })

    } catch (error) {
        console.error("Error while fetching doctor", error)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const getAllDoctors = async (req, res) => {
    try {
        const { data: doctors, error } = await supabase
            .from('doctors')
            .select('id, full_name, email, specialization, qualification, is_active, created_at')

        if (error) throw error

        return res.status(200).json({ message: "All doctors fetched", data: doctors })
    }
    catch (error) {
        console.error("Error while fetching doctors", error)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const getDoctorAppointments = async (req, res) => {
    try {
        console.log("function called: ", req.doctor)
        const doctorId = req.doctor.id

        const date = req.query.date || new Date().toISOString().split('T')[0]

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patients (full_name, email, phone)
            `)
            .eq('doctor_id', doctorId)
            .eq('appointment_date', date)
            .neq('status', 'cancelled')
            .order('appointment_time', { ascending: true })

        if (error) throw error

        // Summary of appointments
        const total = appointments.length
        const completed = appointments.filter(a => a.status === "completed").length
        const pending = appointments.filter(a => a.status === "pending").length
        const noShow = appointments.filter(a => a.status === "no_show").length

        return res.status(200).json({
            success: true,
            date,
            summary: {
                total,
                completed,
                pending,
                noShow,
                data: appointments.map(a => ({
                    id: a.id,
                    patient: {
                        name: a.patients?.full_name,
                        email: a.patients?.email,
                        phone: a.patients?.phone,
                    },
                    appointment_time: a.appointment_time,
                    status: a.status,
                    notes: a.notes
                }))
            }
        })

    }
    catch (error) {
        console.error("Error while getting the doctor appointments: ", error.stack)
        return res.status(500).json({ success: false, message: "Something went wrong" })
    }
}

export const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const doctorId = req.doctor.id;

        const allowedStatuses = ['completed', 'no_show']
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either completed or no_show'
            })
        }

        // Get appointment with ownership check
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('doctor_id', doctorId)
            .single()

        if (fetchError || !appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            })
        }

        if (['completed', 'no_show'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Appointment is already marked as ${appointment.status}.`
            })
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Can not update a cancelled appointment.'
            })
        }

        // Update appointment status
        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) throw updateError

        return res.status(200).json({
            success: true,
            message: `Appointment marked as ${status}.`,
            data: {
                id: updated.id,
                status: updated.status
            }
        })
    }
    catch (error) {
        console.error("Error while updating the appointment status: ", error.stack)
        return res.status(500).json({ success: false, message: "Internal Server Error" })
    }
}