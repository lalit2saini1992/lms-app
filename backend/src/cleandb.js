require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB Connected');
};

const clean = async () => {
  try {
    await connectDB();

    // Drop only these collections — keep users (admin)
    const collections = ['leads', 'followups', 'followuptypes', 'notifications', 'organizations', 'plans', 'roles'];

    for (const col of collections) {
      try {
        await mongoose.connection.collection(col).deleteMany({});
        console.log(`🗑️  Cleared: ${col}`);
      } catch (e) {
        console.log(`⚠️  Skip: ${col} (${e.message})`);
      }
    }

    // Keep only superadmin user
    const User = require('./models/User');
    await User.deleteMany({ role: { $ne: 'superadmin' } });
    console.log('👤 Kept only superadmin user');

    const admin = await User.findOne({ role: 'superadmin' });
    console.log('\n✅ Database cleaned!');
    console.log('─────────────────────────────────');
    console.log(`Admin: ${admin?.email} / Admin@123`);
    console.log('─────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

clean();
