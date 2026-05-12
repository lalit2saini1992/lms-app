const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all users
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const { role, isActive, search, orgId, noOrg } = req.query;
    const filter = {};

    // Superadmin — can filter by org or see all
    if (req.user.role === 'superadmin') {
      if (orgId) filter.organization = orgId;
      else if (noOrg === 'true') filter.organization = null; // platform users only
    } else {
      // Org users see only their org users
      if (req.user.organization) filter.organization = req.user.organization;
    }

    if (role)     filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search)   filter.name     = { $regex: search, $options: 'i' };

    const users = await User.find(filter)
      .select('-password')
      .populate('createdBy', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create user
// @route   POST /api/users
const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, permissions, orgId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Determine organization
    let organization = null;
    if (req.user.role === 'superadmin') {
      organization = orgId || null;
    } else if (req.user.organization) {
      organization = req.user.organization;
    }

    const user = new User({
      name, email, password, phone, role,
      organization,
      createdBy: req.user._id,
    });
    user.setDefaultPermissions();

    if (permissions) {
      // Prevent privilege escalation — can only grant permissions you yourself have
      // Superadmin can grant anything
      const safePerms = req.user.role === 'superadmin'
        ? permissions
        : Object.fromEntries(
            Object.entries(permissions).filter(([key, val]) =>
              val === false || req.user.permissions?.[key] === true
            )
          );
      user.permissions = { ...user.permissions, ...safePerms };
    }

    await user.save();

    await logActivity({
      action: 'user_created',
      performedBy: req.user,
      targetId: user._id,
      targetType: 'User',
      targetName: user.name,
      details: { email: user.email, role: user.role },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, permissions: user.permissions },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { name, phone, role, permissions, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cannot change own role
    if (req.params.id === req.user._id.toString() && role && role !== user.role) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role' });
    }

    // Only superadmin can change permissions
    if (permissions && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can change permissions' });
    }

    // Role hierarchy — cannot assign role >= own level
    const hierarchy = { superadmin: 4, orgadmin: 3, admin: 3, manager: 2, employee: 1 };
    if (role && role !== user.role) {
      const myLevel     = hierarchy[req.user.role]  || 0;
      const targetLevel = hierarchy[role]            || 0;
      if (targetLevel >= myLevel) {
        return res.status(403).json({ success: false, message: `You cannot assign the role "${role}"` });
      }
    }

    const changes = {};
    if (name && name !== user.name)   { changes.name = { from: user.name, to: name }; user.name = name; }
    if (phone !== undefined)          { user.phone = phone; }
    if (isActive !== undefined)       { user.isActive = isActive; }

    if (role && role !== user.role) {
      changes.role = { from: user.role, to: role };
      user.role = role;
      user.setDefaultPermissions();
    }

    if (permissions && req.user.role === 'superadmin') {
      user.permissions = { ...user.permissions, ...permissions };
    } else if (permissions && (req.user.role === 'orgadmin' || req.user.role === 'admin')) {
      // OrgAdmin/Admin can only grant permissions they themselves have
      const safePerms = Object.fromEntries(
        Object.entries(permissions).filter(([key, val]) =>
          val === false || req.user.permissions?.[key] === true
        )
      );
      user.permissions = { ...user.permissions, ...safePerms };
    }

    await user.save();

    await logActivity({
      action: 'user_updated',
      performedBy: req.user,
      targetId: user._id,
      targetType: 'User',
      targetName: user.name,
      details: { changes },
      ip: req.ip,
    });

    res.json({ success: true, user: { _id: user._id, name: user.name, role: user.role, permissions: user.permissions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete (deactivate) user
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cannot deactivate yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    // Role hierarchy check — lower role cannot deactivate higher role
    const hierarchy = { superadmin: 4, orgadmin: 3, admin: 3, manager: 2, employee: 1 };
    const requesterLevel = hierarchy[req.user.role] || 0;
    const targetLevel    = hierarchy[user.role]     || 0;

    if (targetLevel >= requesterLevel) {
      return res.status(403).json({ success: false, message: `You cannot deactivate a ${user.role} account` });
    }

    user.isActive = false;
    await user.save();

    await logActivity({
      action: 'user_deactivated',
      performedBy: req.user,
      targetId: user._id,
      targetType: 'User',
      targetName: user.name,
      details: { email: user.email, role: user.role },
      ip: req.ip,
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword };
