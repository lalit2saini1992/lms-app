const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    source: {
      type: String,
      enum: ['manual', 'excel', 'website', 'referral', 'social_media', 'other'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['new', 'assigned', 'in_progress', 'interested', 'not_interested', 'converted', 'lost'],
      default: 'new',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    product: { type: String, trim: true },
    budget: { type: String, trim: true },
    nextFollowUpDate: { type: Date },
    lastContactedAt: { type: Date },
    importBatch: { type: String }, // for tracking excel imports
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);
