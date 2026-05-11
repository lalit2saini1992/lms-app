const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:    { type: String, required: true, trim: true, lowercase: true },
    phone:    { type: String, trim: true },
    address:  { type: String, trim: true },
    logo:     { type: String }, // URL

    // Subscription
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    planName:     { type: String, default: '' },
    planDuration: {
      type: String,
      enum: ['quarterly', 'halfYearly', 'yearly', 'threeYears'],
      default: 'yearly',
    },
    maxEmployees: { type: Number, default: 5 },
    maxLeads:     { type: Number, default: 500 },
    expiresAt:    { type: Date, required: true },

    // Status
    status: {
      type: String,
      enum: ['active', 'suspended', 'expired', 'trial'],
      default: 'trial',
    },

    // Org Admin credentials (auto-created)
    adminEmail:    { type: String, trim: true, lowercase: true },
    adminName:     { type: String, trim: true },

    // Stats (cached)
    currentEmployees: { type: Number, default: 0 },
    currentLeads:     { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes:     { type: String },
  },
  { timestamps: true }
);

// Auto-set plan limits from Plan model
organizationSchema.pre('save', function (next) {
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
