const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
      phone: req.user.phone,
    },
  });
};

// @desc    Seed first superadmin (run once)
// @route   POST /api/auth/seed
const seedAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Superadmin already exists' });
    }

    const admin = new User({
      name: 'Super Admin',
      email: 'admin@lms.com',
      password: 'Admin@123',
      role: 'superadmin',
    });
    admin.setDefaultPermissions();
    await admin.save();

    res.json({ success: true, message: 'Superadmin created', email: 'admin@lms.com', password: 'Admin@123' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { login, getMe, seedAdmin };
