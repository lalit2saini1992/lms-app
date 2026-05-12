const Role = require('../models/Role');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

// @desc  Get all roles
// @route GET /api/roles
const getRoles = async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role === 'superadmin') {
      // Superadmin sees all roles (global + all org roles)
    } else if (req.user.organization) {
      // Org users see: system roles + their own org's custom roles
      filter.$or = [
        { isSystem: true },
        { organization: req.user.organization },
      ];
    } else {
      filter.isSystem = true;
    }

    const roles = await Role.find(filter)
      .populate('createdBy', 'name')
      .sort({ isSystem: -1, createdAt: -1 });
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create role
// @route POST /api/roles
const createRole = async (req, res) => {
  try {
    const { label, permissions } = req.body;
    if (!label?.trim()) return res.status(400).json({ success: false, message: 'Label is required' });

    // Generate name from label + org suffix to avoid global conflicts
    const orgSuffix = req.user.organization ? `_${req.user.organization.toString().slice(-6)}` : '';
    const name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + orgSuffix;

    const existing = await Role.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: 'Role with this name already exists' });

    // Prevent privilege escalation — org users can only grant their own permissions
    let safePermissions = permissions || {};
    if (req.user.role !== 'superadmin') {
      safePermissions = Object.fromEntries(
        Object.entries(safePermissions).map(([key, val]) => [
          key,
          val && (req.user.permissions?.[key] === true),
        ])
      );
    }

    const role = await Role.create({
      name,
      label,
      permissions: safePermissions,
      organization: req.user.role === 'superadmin' ? null : (req.user.organization || null),
      createdBy: req.user._id,
    });

    await logActivity({
      action: 'role_created',
      performedBy: req.user,
      targetId: role._id,
      targetType: 'Role',
      targetName: role.label,
      ip: req.ip,
    });

    res.status(201).json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update role
// @route PUT /api/roles/:id
const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ success: false, message: 'System roles cannot be modified' });

    // Org users can only edit their own org's roles
    if (req.user.role !== 'superadmin' && role.organization?.toString() !== req.user.organization?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this role' });
    }

    const { label, permissions } = req.body;
    if (label) role.label = label;

    if (permissions) {
      // Prevent privilege escalation
      const safePerms = req.user.role === 'superadmin'
        ? permissions
        : Object.fromEntries(
            Object.entries(permissions).map(([key, val]) => [
              key,
              val && (req.user.permissions?.[key] === true),
            ])
          );
      role.permissions = { ...role.permissions, ...safePerms };
    }

    await role.save();

    // Update all users with this role — sync permissions
    await User.updateMany({ customRole: role._id }, { permissions: role.permissions });

    await logActivity({
      action: 'role_updated',
      performedBy: req.user,
      targetId: role._id,
      targetType: 'Role',
      targetName: role.label,
      ip: req.ip,
    });

    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete role
// @route DELETE /api/roles/:id
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ success: false, message: 'System roles cannot be deleted' });

    // Org users can only delete their own org's roles
    if (req.user.role !== 'superadmin' && role.organization?.toString() !== req.user.organization?.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this role' });
    }

    // Check if any user has this role
    const usersWithRole = await User.countDocuments({ customRole: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${usersWithRole} user(s) have this role. Reassign them first.`,
      });
    }

    role.isActive = false;
    await role.save();

    await logActivity({
      action: 'role_deleted',
      performedBy: req.user,
      targetId: role._id,
      targetType: 'Role',
      targetName: role.label,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed default system roles
const seedSystemRoles = async () => {
  const defaults = [
    {
      name: 'superadmin', label: 'Super Admin', isSystem: true,
      permissions: { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true },
    },
    {
      name: 'admin', label: 'Admin', isSystem: true,
      permissions: { canAddLead:true,canEditLead:true,canDeleteLead:true,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:true,canManageFollowupTypes:true },
    },
    {
      name: 'manager', label: 'Manager', isSystem: true,
      permissions: { canAddLead:true,canEditLead:true,canDeleteLead:false,canAssignLead:true,canImportLead:true,canViewReports:true,canManageUsers:false,canManageFollowupTypes:false },
    },
    {
      name: 'employee', label: 'Employee', isSystem: true,
      permissions: { canAddLead:false,canEditLead:false,canDeleteLead:false,canAssignLead:false,canImportLead:false,canViewReports:false,canManageUsers:false,canManageFollowupTypes:false },
    },
  ];

  for (const d of defaults) {
    await Role.findOneAndUpdate({ name: d.name }, d, { upsert: true, new: true });
  }
  console.log('✅ System roles seeded');
};

module.exports = { getRoles, createRole, updateRole, deleteRole, seedSystemRoles };
