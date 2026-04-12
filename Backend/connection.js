import mongoose from "mongoose"

const connectMongoDb = async (url)=>{
    return mongoose.connect(url);
}

export default connectMongoDb