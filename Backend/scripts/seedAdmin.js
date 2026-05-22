import supabase from '../config/supabase.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
dotenv.config()

const seedAdmin = async () => {
    try {
        const { data: existing } = await supabase
            .from('admins')
            .select('id')
            .eq('email', process.env.ADMIN_EMAIL)
            .single()

        if (existing) {
            console.log('Admin already exists. Skipping.')
            process.exit(0)
        }

        const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)

        const { error } = await supabase.from('admins').insert({
            full_name: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password,
        })

        if (error) throw error

        console.log('Admin created →', process.env.ADMIN_EMAIL)
        process.exit(0)
    } catch (err) {
        console.error('Seed failed:', err.message)
        process.exit(1)
    }
}

seedAdmin()