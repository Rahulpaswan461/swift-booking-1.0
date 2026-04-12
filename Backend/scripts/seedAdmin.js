import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import Admin from '../models/Admin.js'

dotenv.config()

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("MongoDB connected through script !!")

        const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL })
        if (existing) {
            console.log("Admin already exists. Skipping. ")
            process.exit(0)
        }

        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)

        await Admin.create({
            fullName: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword
        })

        console.log(`Admin created successfully -> ${process.env.ADMIN_EMAIL}`)
        process.exit(0)
    }
    catch (error) {
        console.error('Seed failed:', error.message)
        process.exit(1)
    }
}

seedAdmin()