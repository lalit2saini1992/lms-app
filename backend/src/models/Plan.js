const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    maxEmployees:{ type: Number, required: true, default: 5 },
    maxLeads:    { type: Number, required: true, default: 500 },
    // Pricing per duration
    pricing: {
      quarterly:  { type: Number, default: 0 }, // 3 months
      halfYearly: { type: Number, default: 0 }, // 6 months
      yearly:     { type: Number, default: 0 }, // 12 months
      threeYears: { type: Number, default: 0 }, // 36 months
    },
    color:    { type: String, default: '#7c3aed' },
    isActive: { type: Boolean, default: true },
    isDefault:{ type: Boolean, default: false },
    createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
