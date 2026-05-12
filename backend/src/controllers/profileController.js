const User = require('../models/User');

// @desc  Get my profile
// @route GET /api/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update my profile — only name and phone allowed
// @route PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body; // only name allowed
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const user = await User.findById(req.user._id);
    user.name = name.trim();
    await user.save();

    res.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, permissions: user.permissions },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Change my password
// @route PUT /api/profile/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProfile, updateProfile, changePassword };
