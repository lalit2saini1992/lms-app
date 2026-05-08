require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Lead = require('./models/Lead');
const FollowUpType = require('./models/FollowUpType');
const FollowUp = require('./models/FollowUp');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB Connected');
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const users = [
  { name: 'Super Admin',   email: 'admin@lms.com',    password: 'Admin@123',    role: 'superadmin' },
  { name: 'Rahul Sharma',  email: 'rahul@lms.com',    password: 'Pass@123',     role: 'admin' },
  { name: 'Priya Singh',   email: 'priya@lms.com',    password: 'Pass@123',     role: 'manager' },
  { name: 'Amit Kumar',    email: 'amit@lms.com',     password: 'Pass@123',     role: 'employee' },
  { name: 'Neha Gupta',    email: 'neha@lms.com',     password: 'Pass@123',     role: 'employee' },
  { name: 'Ravi Verma',    email: 'ravi@lms.com',     password: 'Pass@123',     role: 'employee' },
];

const followUpTypesSeed = [
  { label: 'Not Pick',       color: '#ef4444' },
  { label: 'Switch Off',     color: '#64748b' },
  { label: 'Busy',           color: '#f59e0b' },
  { label: 'Call Back',      color: '#6366f1' },
  { label: 'Interested',     color: '#10b981' },
  { label: 'Not Interested', color: '#dc2626' },
  { label: 'Deal Done',      color: '#059669' },
  { label: 'Wrong Number',   color: '#94a3b8' },
  { label: 'Follow Up Later',color: '#8b5cf6' },
];

const leadNames = [
  ['Vikram Malhotra', '9876543210', 'vikram@gmail.com',   'Delhi',     'Home Loan'],
  ['Sunita Patel',    '9812345678', 'sunita@gmail.com',   'Mumbai',    'Car Loan'],
  ['Deepak Joshi',    '9823456789', 'deepak@yahoo.com',   'Pune',      'Personal Loan'],
  ['Kavita Rao',      '9834567890', 'kavita@gmail.com',   'Bangalore', 'Insurance'],
  ['Manish Tiwari',   '9845678901', 'manish@gmail.com',   'Lucknow',   'Mutual Fund'],
  ['Pooja Mehta',     '9856789012', 'pooja@gmail.com',    'Jaipur',    'Home Loan'],
  ['Suresh Nair',     '9867890123', 'suresh@gmail.com',   'Chennai',   'Car Loan'],
  ['Anita Desai',     '9878901234', 'anita@gmail.com',    'Ahmedabad', 'Personal Loan'],
  ['Rajesh Pandey',   '9889012345', 'rajesh@gmail.com',   'Varanasi',  'Insurance'],
  ['Meena Kapoor',    '9890123456', 'meena@gmail.com',    'Noida',     'Mutual Fund'],
  ['Arun Saxena',     '9901234567', 'arun@gmail.com',     'Gurgaon',   'Home Loan'],
  ['Shalini Mishra',  '9912345678', 'shalini@gmail.com',  'Indore',    'Car Loan'],
  ['Vinod Chauhan',   '9923456789', 'vinod@gmail.com',    'Bhopal',    'Personal Loan'],
  ['Rekha Srivastava','9934567890', 'rekha@gmail.com',    'Agra',      'Insurance'],
  ['Prakash Yadav',   '9945678901', 'prakash@gmail.com',  'Patna',     'Mutual Fund'],
  ['Geeta Sharma',    '9956789012', 'geeta@gmail.com',    'Chandigarh','Home Loan'],
  ['Santosh Kumar',   '9967890123', 'santosh@gmail.com',  'Hyderabad', 'Car Loan'],
  ['Usha Pillai',     '9978901234', 'usha@gmail.com',     'Kochi',     'Personal Loan'],
  ['Dinesh Agarwal',  '9989012345', 'dinesh@gmail.com',   'Surat',     'Insurance'],
  ['Lata Bhatt',      '9990123456', 'lata@gmail.com',     'Nagpur',    'Mutual Fund'],
];

const statuses = ['new', 'assigned', 'in_progress', 'interested', 'not_interested', 'converted', 'lost'];
const sources  = ['manual', 'website', 'referral', 'social_media', 'excel'];
const budgets  = ['₹1-2 Lakh', '₹2-5 Lakh', '₹5-10 Lakh', '₹10-20 Lakh', '₹20+ Lakh'];
const methods  = ['call', 'whatsapp', 'email', 'message'];
const remarks  = [
  'Customer is interested, will call back tomorrow',
  'Phone was busy, tried 3 times',
  'Customer asked for more details via WhatsApp',
  'Not picking up since morning',
  'Very interested, wants to meet in person',
  'Asked to call after 5 PM',
  'Already taken from another company',
  'Budget is low, needs smaller plan',
  'Sent brochure on WhatsApp',
  'Deal almost done, final discussion pending',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysLater = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ─── Main Seed Function ───────────────────────────────────────────────────────

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Lead.deleteMany({}),
      FollowUpType.deleteMany({}),
      FollowUp.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const u of users) {
      const user = new User(u);
      user.setDefaultPermissions();
      await user.save();
      createdUsers.push(user);
    }
    console.log(`👤 Created ${createdUsers.length} users`);

    const adminUser    = createdUsers[0];
    const employees    = createdUsers.filter(u => u.role === 'employee');

    // Create follow-up types
    const createdTypes = [];
    for (const t of followUpTypesSeed) {
      const type = await FollowUpType.create({ ...t, createdBy: adminUser._id });
      createdTypes.push(type);
    }
    console.log(`🏷️  Created ${createdTypes.length} follow-up types`);

    // Create leads
    const createdLeads = [];
    for (let i = 0; i < leadNames.length; i++) {
      const [name, phone, email, city, product] = leadNames[i];
      const assignedTo = rand(employees);
      const status = rand(statuses);
      const lead = await Lead.create({
        name, phone, email, city, product,
        source: rand(sources),
        budget: rand(budgets),
        status,
        assignedTo: assignedTo._id,
        createdBy: adminUser._id,
        notes: `Lead from ${rand(sources)} campaign. Interested in ${product}.`,
        createdAt: daysAgo(randInt(1, 60)),
        nextFollowUpDate: status === 'in_progress' || status === 'interested'
          ? daysLater(randInt(1, 7))
          : null,
        lastContactedAt: daysAgo(randInt(0, 10)),
      });
      createdLeads.push({ lead, assignedTo });
    }
    console.log(`👥 Created ${createdLeads.length} leads`);

    // Create follow-ups (2-4 per lead)
    let totalFollowUps = 0;
    for (const { lead, assignedTo } of createdLeads) {
      const count = randInt(1, 4);
      for (let j = 0; j < count; j++) {
        await FollowUp.create({
          lead: lead._id,
          doneBy: assignedTo._id,
          followUpType: rand(createdTypes)._id,
          communicationMethod: rand(methods),
          remark: rand(remarks),
          nextFollowUpDate: j === count - 1 ? daysLater(randInt(1, 5)) : null,
          createdAt: daysAgo(randInt(0, 30)),
        });
        totalFollowUps++;
      }
    }
    console.log(`📞 Created ${totalFollowUps} follow-ups`);

    console.log('\n✅ Seed complete!\n');
    console.log('─────────────────────────────────────');
    console.log('🔐 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Super Admin  →  admin@lms.com   / Admin@123');
    console.log('Admin        →  rahul@lms.com   / Pass@123');
    console.log('Manager      →  priya@lms.com   / Pass@123');
    console.log('Employee     →  amit@lms.com    / Pass@123');
    console.log('Employee     →  neha@lms.com    / Pass@123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
