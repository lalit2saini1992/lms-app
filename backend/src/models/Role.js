const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true }, // Display name
    permissions: {
      canAddLead:             { type: Boolean, default: false },
      canEditLead:            { type: Boolean, default: false },
      canDeleteLead:          { type: Boolean, default: false },
      canAssignLead:          { type: Boolean, default: false },
      canImportLead:          { type: Boolean, default: false },
      canViewReports:         { type: Boolean, default: false },
      canManageUsers:         { type: Boolean, default: false },
      canManageFollowupTypes: { type: Boolean, default: false },
    },
    isSystem: { type: Boolean, default: false }, // system roles can't be deleted
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
