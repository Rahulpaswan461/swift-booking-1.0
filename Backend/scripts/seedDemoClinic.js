import supabase from '../config/supabase.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config()

/**
 * Seed a demo clinic with sample data for the "Try Demo" experience.
 * Idempotent — safe to run multiple times.
 */

const DEMO_CLINIC_SLUG = 'demo-clinic'
const DEMO_ADMIN_EMAIL = 'demo@medibook.com'
const DEMO_ADMIN_PASSWORD = 'demo1234'

async function seedDemoClinic() {
  try {
    // 1. Check if demo clinic already exists
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('slug', DEMO_CLINIC_SLUG)
      .single()

    let clinic = existingClinic
    if (!clinic) {
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          name: 'MediBook Demo Clinic',
          slug: DEMO_CLINIC_SLUG,
          address: '42 Demo Street, Healthcare City',
          specialization: 'Multi-Specialty',
          owner_email: DEMO_ADMIN_EMAIL,
          is_active: true,
          subscription_plan: 'pro',
          trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          branding: {
            clinic_name: 'MediBook Demo Clinic',
            primary_color: '#0171be',
            tagline: 'Experience the power of MediBook — your own booking platform',
          },
        })
        .select('*')
        .single()

      if (clinicError) throw clinicError
      clinic = newClinic
      console.log('✅ Demo clinic created →', clinic.name)
    } else {
      console.log('✅ Demo clinic already exists')
    }

    // 2. Create demo admin (if not exists)
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', DEMO_ADMIN_EMAIL)
      .single()

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12)
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          full_name: 'Demo Admin',
          email: DEMO_ADMIN_EMAIL,
          password: hashedPassword,
          clinic_id: clinic.id,
        })

      if (adminError) throw adminError
      console.log('✅ Demo admin created →', DEMO_ADMIN_EMAIL)
    } else {
      console.log('✅ Demo admin already exists')
    }

    // 3. Create demo doctors (if not already created for this clinic)
    const demoDoctors = [
      { full_name: 'Dr. Sarah Johnson', email: 'sarah@demo.medibook', specialization: 'Cardiology', qualification: 'MBBS, MD (Cardiology)' },
      { full_name: 'Dr. Amit Patel', email: 'amit@demo.medibook', specialization: 'Dermatology', qualification: 'MBBS, MD (Dermatology)' },
      { full_name: 'Dr. Priya Sharma', email: 'priya@demo.medibook', specialization: 'Pediatrics', qualification: 'MBBS, DCH' },
    ]

    const { data: existingDoctors } = await supabase
      .from('doctors')
      .select('email')
      .eq('clinic_id', clinic.id)

    const existingDoctorEmails = new Set(existingDoctors?.map(d => d.email) || [])

    for (const doc of demoDoctors) {
      if (!existingDoctorEmails.has(doc.email)) {
        const doctorPassword = await bcrypt.hash('Doctor@123', 12)
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            full_name: doc.full_name,
            email: doc.email,
            password: doctorPassword,
            qualification: doc.qualification,
            specialization: doc.specialization,
            clinic_id: clinic.id,
            is_active: true,
            first_login: true,
          })

        if (doctorError) {
          console.log(`⚠️  Could not create doctor ${doc.full_name}:`, doctorError.message)
        } else {
          console.log(`✅ Demo doctor created → ${doc.full_name}`)
        }
      }
    }

    // 4. Create demo subscription (pro plan, never expires)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('status', 'active')
      .single()

    if (!existingSub) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          clinic_id: clinic.id,
          plan: 'pro',
          status: 'active',
          started_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })

      if (subError) {
        console.log('⚠️  Could not create demo subscription:', subError.message)
      } else {
        console.log('✅ Demo subscription created (pro, 1 year)')
      }
    }

    // 5. Create some sample appointments for today (so the dashboard looks alive)
    const today = new Date().toISOString().split('T')[0]
    const { data: todayAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('appointment_date', today)

    if (!todayAppointments || todayAppointments.length === 0) {
      // Get the demo doctors for this clinic
      const { data: clinicDoctors } = await supabase
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinic.id)
        .eq('is_active', true)

      const samplePatients = [
        { full_name: 'Rahul Kumar', phone: '9876543210', email: 'rahul@example.com' },
        { full_name: 'Anita Desai', phone: '9876543211', email: 'anita@example.com' },
        { full_name: 'Mike Wilson', phone: '9876543212', email: 'mike@example.com' },
        { full_name: 'Sneha Reddy', phone: '9876543213', email: 'sneha@example.com' },
        { full_name: 'James Chen', phone: '9876543214', email: 'james@example.com' },
      ]

      const statuses = ['confirmed', 'confirmed', 'completed', 'confirmed', 'no_show']
      const times = ['09:00', '10:30', '11:00', '14:00', '15:30']

      for (let i = 0; i < samplePatients.length; i++) {
        const patient = samplePatients[i]
        const doctor = clinicDoctors?.[i % clinicDoctors.length]

        // Upsert patient (create or get existing)
        let { data: patientRow } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', patient.phone)
          .eq('clinic_id', clinic.id)
          .single()

        if (!patientRow) {
          const { data: newPatient } = await supabase
            .from('patients')
            .insert({
              full_name: patient.full_name,
              phone: patient.phone,
              email: patient.email,
              clinic_id: clinic.id,
            })
            .select('id')
            .single()
          patientRow = newPatient
        }

        if (patientRow && doctor) {
          await supabase
            .from('appointments')
            .insert({
              patient_id: patientRow.id,
              doctor_id: doctor.id,
              clinic_id: clinic.id,
              appointment_date: today,
              appointment_time: times[i],
              status: statuses[i],
              notes: 'Demo appointment',
            })
        }
      }
      console.log('✅ Sample appointments created for today')
    } else {
      console.log('✅ Sample appointments already exist for today')
    }

    console.log('\n🎉 Demo seed complete!')
    console.log('   Demo admin:', DEMO_ADMIN_EMAIL, '/', DEMO_ADMIN_PASSWORD)
    console.log('   Demo slug:', DEMO_CLINIC_SLUG)
    process.exit(0)
  } catch (err) {
    console.error('❌ Demo seed failed:', err.message)
    process.exit(1)
  }
}

seedDemoClinic()
