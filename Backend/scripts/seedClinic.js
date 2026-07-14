import supabase from '../config/supabase.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config()

const seedClinic = async () => {
  try {
    // 1. Create the clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name: 'Swift Booking Clinic',
        slug: 'swift',
        address: '123 Main Street',
        specialization: 'General',
        owner_email: process.env.ADMIN_EMAIL || 'admin@example.com',
        is_active: true,
        subscription_plan: 'free',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (clinicError) {
      console.log('Clinic already exists or error:', clinicError.message)
    } else {
      console.log('✅ Clinic created →', clinic.name, '(slug:', clinic.slug + ')')
    }

    // Use existing clinic if insert failed (already exists)
    const { data: activeClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!activeClinic) {
      console.error('❌ No active clinic found after seed attempt')
      process.exit(1)
    }

    // 2. Create the admin (if not exists)
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', process.env.ADMIN_EMAIL)
      .single()

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          full_name: process.env.ADMIN_NAME || 'Admin User',
          email: process.env.ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          clinic_id: activeClinic.id,
        })

      if (adminError) throw adminError
      console.log('✅ Admin created →', process.env.ADMIN_EMAIL)
    } else {
      // Backfill clinic_id if missing
      const { data: admin } = await supabase
        .from('admins')
        .select('clinic_id')
        .eq('email', process.env.ADMIN_EMAIL)
        .single()

      if (!admin?.clinic_id) {
        await supabase
          .from('admins')
          .update({ clinic_id: activeClinic.id })
          .eq('email', process.env.ADMIN_EMAIL)
        console.log('🔧 Backfilled clinic_id for admin')
      }
      console.log('✅ Admin already exists')
    }

    // 3. Create a default doctor for testing (if not exists)
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('email', 'doctor@example.com')
      .single()

    if (!existingDoctor) {
      const doctorPassword = await bcrypt.hash('Doctor@123', 12)
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          full_name: 'Dr. Test Doctor',
          email: 'doctor@example.com',
          password: doctorPassword,
          qualification: 'MBBS',
          specialization: 'General Medicine',
          clinic_id: activeClinic.id,
          is_active: true,
          first_login: true,
        })

      if (doctorError) {
        console.log('⚠️  Could not create default doctor:', doctorError.message)
      } else {
        console.log('✅ Default doctor created → doctor@example.com (password: Doctor@123)')
      }
    } else {
      // Backfill clinic_id if missing
      const { data: doctor } = await supabase
        .from('doctors')
        .select('clinic_id')
        .eq('email', 'doctor@example.com')
        .single()

      if (!doctor?.clinic_id) {
        await supabase
          .from('doctors')
          .update({ clinic_id: activeClinic.id })
          .eq('email', 'doctor@example.com')
        console.log('🔧 Backfilled clinic_id for doctor')
      }
      console.log('✅ Doctor already exists')
    }

    // 4. Create initial subscription for the clinic (if not exists)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('clinic_id', activeClinic.id)
      .eq('status', 'active')
      .single()

    if (!existingSub) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          clinic_id: activeClinic.id,
          plan: 'free',
          status: 'trialing',
          started_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })

      if (subError) {
        console.log('⚠️  Could not create subscription:', subError.message)
      } else {
        console.log('✅ Free trial subscription created (14 days)')
      }
    } else {
      console.log('✅ Subscription already exists')
    }

    console.log('\n🎉 Seed complete!')
    console.log('   Admin:  ', process.env.ADMIN_EMAIL, '/', process.env.ADMIN_PASSWORD)
    console.log('   Doctor: doctor@example.com / Doctor@123')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed failed:', err.message)
    process.exit(1)
  }
}

seedClinic()
