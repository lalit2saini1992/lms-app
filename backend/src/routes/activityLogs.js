const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { orgScope } = require('../middleware/orgIsolation');

router.use(protect);
router.use(orgScope);

// @desc  Get activity logs
// @route GET /api/activity-logs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    const filter = {};

    // Superadmin sees all; org users see only their org
    if (req.user.role !== 'superadmin') {
      filter.organization = req.user.organization;
    }

    if (action) filter.action = action;
    if (userId) filter.performedBy = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
