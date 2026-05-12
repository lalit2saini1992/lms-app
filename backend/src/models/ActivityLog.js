const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'lead_created', 'lead_updated', 'lead_deleted', 'lead_assigned', 'lead_imported',
        'followup_created', 'followup_type_created', 'followup_type_updated', 'followup_type_deleted',
        'user_created', 'user_updated', 'user_deactivated',
        'org_created', 'org_updated', 'org_deleted', 'org_status_changed',
        'role_created', 'role_updated', 'role_deleted',
        'login', 'logout',
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    targetId:   { type: mongoose.Schema.Types.ObjectId, default: null }, // ID of affected entity
    targetType: { type: String, default: null },                          // 'Lead', 'User', etc.
    targetName: { type: String, default: null },                          // Human-readable name
    details:    { type: mongoose.Schema.Types.Mixed, default: {} },       // Extra info
    ip:         { type: String, default: null },
  },
  { timestamps: true }
);

// Index for fast queries
activityLogSchema.index({ performedBy: 1, createdAt: -1 });
activityLogSchema.index({ organization: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
