const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'manager', 'employee', 'custom', 'orgadmin'],
      default: 'employee',
    },
    customRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    permissions: {
      canAddLead: { type: Boolean, default: false },
      canEditLead: { type: Boolean, default: false },
      canDeleteLead: { type: Boolean, default: false },
      canAssignLead: { type: Boolean, default: false },
      canImportLead: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canManageFollowupTypes: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function () {
  const rolePermissions = {
    superadmin: {
      canAddLead: true, canEditLead: true, canDeleteLead: true,
      canAssignLead: true, canImportLead: true, canViewReports: true,
      canManageUsers: true, canManageFollowupTypes: true,
    },
    admin: {
      canAddLead: true, canEditLead: true, canDeleteLead: true,
      canAssignLead: true, canImportLead: true, canViewReports: true,
      canManageUsers: true, canManageFollowupTypes: true,
    },
    manager: {
      canAddLead: true, canEditLead: true, canDeleteLead: false,
      canAssignLead: true, canImportLead: true, canViewReports: true,
      canManageUsers: false, canManageFollowupTypes: false,
    },
    employee: {
      canAddLead: false, canEditLead: false, canDeleteLead: false,
      canAssignLead: false, canImportLead: false, canViewReports: false,
      canManageUsers: false, canManageFollowupTypes: false,
    },
  };
  this.permissions = rolePermissions[this.role] || rolePermissions.employee;
};

module.exports = mongoose.model('User', userSchema);
