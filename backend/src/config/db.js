const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MongoDB connection failed: ${error.message}`);
    console.error(`\n👉 Fix options:`);
    console.error(`   1. Start MongoDB locally:  mongod --dbpath C:/data/db`);
    console.error(`   2. Use MongoDB Atlas (free): https://cloud.mongodb.com`);
    console.error(`      Then update MONGODB_URI in backend/.env\n`);
    process.exit(1);
  }
};

module.exports = connectDB;
