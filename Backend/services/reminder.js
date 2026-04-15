import cron from 'node-cron'
import Appointment from '../models/Appointment.js'
import { sendReminderEmail } from '../services/emailService.js'

export const startReminderJob = () => {

    // Runs every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('Running reminder job...')

        try {
            // Get tomorrow's date
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowStr = tomorrow.toISOString().split('T')[0]

            // Find all confirmed appointments for tomorrow
            const appointments = await Appointment.find({
                appointment_date: tomorrowStr,
                status: 'confirmed',
            })
                .populate('patient_id', 'fullName email')
                .populate('doctor_id', 'fullName specialization')

            console.log(`Found ${appointments.length} appointments for tomorrow`)

            // Send reminder to each patient
            for (const appt of appointments) {
                try {
                    await sendReminderEmail({
                        patient: appt.patient_id,
                        doctor: appt.doctor_id,
                        appointment: appt,
                    })
                    console.log(`Reminder sent to ${appt.patient_id.email}`)
                } catch (err) {
                    // Don't stop the loop if one email fails
                    console.error(`Failed to send reminder to ${appt.patient_id.email}:`, err.message)
                }
            }

            console.log('Reminder job completed')

        } catch (err) {
            console.error('Reminder job failed:', err.message)
        }
    }, {
        timezone: 'Asia/Kolkata'   // IST — change if needed
    })

    console.log('Reminder cron job scheduled — runs daily at 8:00 AM IST')
}