import mongoose from "mongoose"

const doctorSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    qualification:{
        type: String,
    },
    specialization: {
        type: String,
    },
    is_active: {
        type: Boolean,
        default: true
    },
    first_login:{
        type: Boolean,
        default: true
    }
    
},{timestamps: {createdAt: "created_at"}});

// doctorSchema.pre("save", async function(next){
//     const user = this;

//     if(!user.isModified("password")) return next();
//     try{
//        const salt = await bcrypt.getnSalt(10);

//        const hashedPassword = await bcrypt.hash(user.password, salt)

//        user.password = hashedPassword

//        next();
//     }
//     catch(error){
//         return next(error)
//     }

// })

// doctorSchema.static("matchPasswordAndGenerateToken", async function(email,password){
//    const user = await this.findOne({email})

//    if(!user) throw new Error("Invalid username or password !!")

//   const isMatch = await bcrypt.compare(password,user.password)

//    return isMatch
// })

const Doctor = mongoose.model("Doctor", doctorSchema)

export default Doctor