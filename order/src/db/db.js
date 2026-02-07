const mongoose = require('mongoose');

async function connectDB() {
    try{
        await mongoose.connect(process.env.MONGO_URL)
        console.log('Database connected');
    }
    catch(err){
        console.error('Error',err);
    }
    
}
module.exports = connectDB;