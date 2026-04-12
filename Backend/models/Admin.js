import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required:true,
    },
    email:{
        type: String,
        required:true,
        unique: true,
    },
    password:{
        type: String,
        required:true,
        select: false,
    },
    role: {
        type: String,
        default: 'admin'
    }
},{timestamps:{createdAt: 'created_at'}})

const Admin = mongoose.model("Admin", adminSchema)

export default Admin;