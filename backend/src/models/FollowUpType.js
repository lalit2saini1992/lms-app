const mongoose = require('mongoose');

const followUpTypeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    color: { type: String, default: '#6366f1' }, // hex color for UI badge
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FollowUpType', followUpTypeSchema);
