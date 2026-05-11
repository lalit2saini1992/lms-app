const Role = require('../models/Role');
const User = require('../models/User');

// @desc  Get all roles
// @route GET /api/roles
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
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

    // Generate name from label
    const name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const existing = await Role.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: 'Role with this name already exists' });

    const role = await Role.create({
      name, label, permissions: permissions || {},
      createdBy: req.user._id,
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

    const { label, permissions } = req.body;
    if (label) role.label = label;
    if (permissions) role.permissions = { ...role.permissions, ...permissions };
    await role.save();

    // Update all users with this role — sync permissions
    await User.updateMany(
      { customRole: role._id },
      { permissions: role.permissions }
    );

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
