const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followUpType: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUpType', required: true },
    communicationMethod: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'message', 'in_person', 'other'],
      required: true,
    },
    remark: { type: String, trim: true },
    nextFollowUpDate: { type: Date },
    callDuration: { type: Number }, // in seconds, optional
  },
  { timestamps: true }
);

followUpSchema.index({ lead: 1, createdAt: -1 });
followUpSchema.index({ doneBy: 1, createdAt: -1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
