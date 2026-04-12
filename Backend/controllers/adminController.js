import Admin from "../models/Admin.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Appointment from "../models/Appointment.js"
import Doctor from "../models/Doctor.js"

export const adminlogin = async (req, res) =>{
    try{
        console.log("reaches the admin page: ")
       const {email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            })
        }

        const admin = await Admin.findOne({ email }).select('+password')
        if (!admin) {
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
            {id: admin._id, role: 'admin', email: admin.email},
            process.env.JWT_SECRET,
            {expiresIn: '12h'}
        )

        console.log("this part also get executed: ")

        return res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                fullName: admin.fullName,
                email: admin.email
            }
        })

    }
    catch(error){
      console.error('adminLogin error:', error)
    return res.status(500).json({ success: false, message: 'Server error.' })  
    }
}

export const getAllAppointments = async (req, res) => {
    try {
        const { date, doctor, status } = req.query
        const filter = {}

        if (date) filter.appointment_date = date
        if (doctor) filter.doctor_id = doctor
        if (status) filter.status = status

        if (!date) {
            filter.appointment_date = new Date().toISOString().split('T')[0]
        }

        const appointments = await Appointment.find(filter)
        .populate("patient_id","fullName email phone")
        .populate("doctor_id","fullName specialization")

    const total     = appointments.length
    const confirmed = appointments.filter(a => a.status === 'confirmed').length
    const completed = appointments.filter(a => a.status === 'completed').length
    const cancelled = appointments.filter(a => a.status === 'cancelled').length
    const no_show   = appointments.filter(a => a.status === 'no_show').length

        return res.status(200).json({
            success: true,
            summary: { total, confirmed, completed, cancelled, no_show },
            data: appointments.map((a => ({
                id: a._id,
                patient: {
                    name: a.patient_id?.fullName,
                    email: a.patient_id?.email,
                    phone: a.patient_id?.phone,

                },
                doctor: {
                    name: a.doctor_id?.fullName,
                    specialization: a.doctor_id?.specialization,
                },
                appointment_date: a.appointment_date,
                appointment_time: a.appointment_time,
                status: a.status,
                notes: a.notes,
                created_at: a.created_at,
            })))
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
    const now       = new Date()
    const dayOfWeek = now.getDay() || 7               // Sunday = 7
    const monday    = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    const weekStart = monday.toISOString().split('T')[0]

    const [
      todayAppointments,
      weekAppointments,
      totalAppointments,
      totalDoctors,
      totalPatients,
    ] = await Promise.all([
      // Today
      Appointment.find({ appointment_date: today }),

      // This week
      Appointment.find({ appointment_date: { $gte: weekStart } }),

      // All time
      Appointment.countDocuments(),

      // Active doctors
      Doctor.countDocuments({ is_active: true }),

      // Unique patients (distinct count)
      Appointment.distinct('patient_id'),
    ])

    // Per doctor breakdown for today
    const doctorBreakdown = await Appointment.aggregate([
      { $match: { appointment_date: today } },
      { $group: {
          _id:       '$doctor_id',
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          pending:   { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          no_show:   { $sum: { $cond: [{ $eq: ['$status', 'no_show']   }, 1, 0] } },
      }},
      { $lookup: {
          from:         'doctors',
          localField:   '_id',
          foreignField: '_id',
          as:           'doctor'
      }},
      { $unwind: '$doctor' },
      { $project: {
          doctorName:     '$doctor.fullName',
          specialization: '$doctor.specialization',
          total:    1,
          completed: 1,
          pending:  1,
          no_show:  1,
      }}
    ])

    return res.status(200).json({
      success: true,
      data: {
        today: {
          total:     todayAppointments.length,
          confirmed: todayAppointments.filter(a => a.status === 'confirmed').length,
          completed: todayAppointments.filter(a => a.status === 'completed').length,
          cancelled: todayAppointments.filter(a => a.status === 'cancelled').length,
          no_show:   todayAppointments.filter(a => a.status === 'no_show').length,
        },
        this_week: {
          total:     weekAppointments.length,
          completed: weekAppointments.filter(a => a.status === 'completed').length,
          cancelled: weekAppointments.filter(a => a.status === 'cancelled').length,
        },
        all_time: {
          total_appointments: totalAppointments,
          total_doctors:      totalDoctors,
          total_patients:     totalPatients.length,
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
  const doctor = await Doctor.findById(req.params.id)
  doctor.is_active = !doctor.is_active
  await doctor.save()
  return res.status(200).json({ success: true, data: doctor })
}