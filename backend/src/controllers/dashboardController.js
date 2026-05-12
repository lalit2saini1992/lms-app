const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee';
    const isSuperadmin = req.user.role === 'superadmin';

    // Apply org isolation for non-superadmin users
    const orgFilter = isSuperadmin ? {} : (req.orgFilter || {});

    const leadFilter = isEmployee
      ? { assignedTo: req.user._id, isActive: true, ...orgFilter }
      : { isActive: true, ...orgFilter };
    const followUpFilter = isEmployee ? { doneBy: req.user._id } : {};

    const [
      totalLeads,
      newLeads,
      assignedLeads,
      inProgressLeads,
      convertedLeads,
      lostLeads,
      totalFollowUps,
      todayFollowUps,
      totalUsers,
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, status: 'new' }),
      Lead.countDocuments({ ...leadFilter, status: 'assigned' }),
      Lead.countDocuments({ ...leadFilter, status: 'in_progress' }),
      Lead.countDocuments({ ...leadFilter, status: 'converted' }),
      Lead.countDocuments({ ...leadFilter, status: 'lost' }),
      FollowUp.countDocuments(followUpFilter),
      FollowUp.countDocuments({
        ...followUpFilter,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      isEmployee ? Promise.resolve(0) : User.countDocuments({ isActive: true }),
    ]);

    // Leads due for follow-up today
    const dueToday = await Lead.countDocuments({
      ...leadFilter,
      nextFollowUpDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    res.json({
      success: true,
      stats: {
        totalLeads, newLeads, assignedLeads, inProgressLeads,
        convertedLeads, lostLeads, totalFollowUps, todayFollowUps,
        totalUsers, dueToday,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get lead status chart data
// @route   GET /api/dashboard/chart
const getChartData = async (req, res) => {
  try {
    const isSuperadmin = req.user.role === 'superadmin';
    const orgFilter = isSuperadmin ? {} : (req.orgFilter || {});
    const filter = req.user.role === 'employee'
      ? { assignedTo: req.user._id, isActive: true, ...orgFilter }
      : { isActive: true, ...orgFilter };

    const statusData = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Last 7 days lead creation trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendData = await Lead.aggregate([
      { $match: { ...filter, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, statusData, trendData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recent activity
// @route   GET /api/dashboard/activity
const getActivity = async (req, res) => {
  try {
    const filter = req.user.role === 'employee' ? { doneBy: req.user._id } : {};

    const recentFollowUps = await FollowUp.find(filter)
      .populate('lead', 'name phone')
      .populate('doneBy', 'name')
      .populate('followUpType', 'label color')
      .sort({ createdAt: -1 })
      .limit(10);

    const upcomingFollowUps = await Lead.find({
      ...(req.user.role === 'employee' ? { assignedTo: req.user._id } : {}),
      isActive: true,
      nextFollowUpDate: { $gte: new Date() },
    })
      .populate('assignedTo', 'name')
      .sort({ nextFollowUpDate: 1 })
      .limit(10);

    res.json({ success: true, recentFollowUps, upcomingFollowUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getStats, getChartData, getActivity };
