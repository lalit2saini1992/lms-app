const FollowUp = require('../models/FollowUp');
const FollowUpType = require('../models/FollowUpType');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('./notificationController');

// ─── Follow-Up Types ──────────────────────────────────────────────────────────

// @desc    Get all follow-up types
// @route   GET /api/followup-types
const getFollowUpTypes = async (req, res) => {
  try {
    const types = await FollowUpType.find({ isActive: true }).sort({ label: 1 });
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create follow-up type
// @route   POST /api/followup-types
const createFollowUpType = async (req, res) => {
  try {
    const { label, color, description } = req.body;
    const type = await FollowUpType.create({ label, color, description, createdBy: req.user._id });

    await logActivity({
      action: 'followup_type_created',
      performedBy: req.user,
      targetId: type._id,
      targetType: 'FollowUpType',
      targetName: type.label,
      ip: req.ip,
    });

    res.status(201).json({ success: true, type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update follow-up type
// @route   PUT /api/followup-types/:id
const updateFollowUpType = async (req, res) => {
  try {
    const type = await FollowUpType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!type) return res.status(404).json({ success: false, message: 'Type not found' });

    await logActivity({
      action: 'followup_type_updated',
      performedBy: req.user,
      targetId: type._id,
      targetType: 'FollowUpType',
      targetName: type.label,
      ip: req.ip,
    });

    res.json({ success: true, type });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete follow-up type
// @route   DELETE /api/followup-types/:id
const deleteFollowUpType = async (req, res) => {
  try {
    const type = await FollowUpType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!type) return res.status(404).json({ success: false, message: 'Type not found' });

    await logActivity({
      action: 'followup_type_deleted',
      performedBy: req.user,
      targetId: type._id,
      targetType: 'FollowUpType',
      targetName: type.label,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Follow-up type deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Follow-Ups ───────────────────────────────────────────────────────────────

// @desc    Get follow-ups for a lead
// @route   GET /api/followups?leadId=xxx
const getFollowUps = async (req, res) => {
  try {
    const { leadId, userId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (leadId) filter.lead = leadId;
    if (userId) filter.doneBy = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Employees only see their own follow-ups
    if (req.user.role === 'employee') {
      filter.doneBy = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await FollowUp.countDocuments(filter);
    const followUps = await FollowUp.find(filter)
      .populate('lead', 'name phone email')
      .populate('doneBy', 'name email')
      .populate('followUpType', 'label color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, followUps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create follow-up
// @route   POST /api/followups
const createFollowUp = async (req, res) => {
  try {
    const { leadId, followUpTypeId, communicationMethod, remark, nextFollowUpDate } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const followUp = await FollowUp.create({
      lead: leadId,
      doneBy: req.user._id,
      followUpType: followUpTypeId,
      communicationMethod,
      remark,
      nextFollowUpDate,
    });

    // Update lead's last contacted and next follow-up date
    lead.lastContactedAt = new Date();
    if (nextFollowUpDate) lead.nextFollowUpDate = nextFollowUpDate;
    lead.status = 'in_progress';
    await lead.save();

    const populated = await followUp.populate([
      { path: 'followUpType', select: 'label color' },
      { path: 'doneBy', select: 'name email' },
    ]);

    // Notify upper-level users in the same org (managers, admins, orgadmin)
    // Only if follow-up was done by an employee (not self-notification)
    if (req.user.role === 'employee' || req.user.role === 'manager') {
      const orgId = req.user.organization;
      if (orgId) {
        const upperRoles = req.user.role === 'employee'
          ? ['manager', 'admin', 'orgadmin']
          : ['admin', 'orgadmin'];

        const upperUsers = await User.find({
          organization: orgId,
          role: { $in: upperRoles },
          isActive: true,
        }).select('_id');

        const followUpTypeDoc = await FollowUpType.findById(followUpTypeId).select('label');
        const typeLabel = followUpTypeDoc?.label || 'Follow-up';

        await Promise.all(upperUsers.map(u =>
          createNotification({
            userId: u._id,
            title: 'Follow-up Updated',
            message: `${req.user.name} logged "${typeLabel}" on lead "${lead.name}" (${lead.phone})`,
            type: 'followup_update',
            link: `/leads/${leadId}`,
            createdBy: req.user._id,
          })
        ));
      }
    }

    await logActivity({
      action: 'followup_created',
      performedBy: req.user,
      targetId: followUp._id,
      targetType: 'FollowUp',
      targetName: `Follow-up on lead: ${lead.name}`,
      details: { leadId, communicationMethod, followUpTypeId },
      ip: req.ip,
    });

    res.status(201).json({ success: true, followUp: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get follow-up summary (admin report)
// @route   GET /api/followups/summary
const getFollowUpSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchFilter = {};

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    const summary = await FollowUp.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$doneBy',
          total: { $sum: 1 },
          methods: { $push: '$communicationMethod' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          total: 1,
          methods: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFollowUpTypes, createFollowUpType, updateFollowUpType, deleteFollowUpType,
  getFollowUps, createFollowUp, getFollowUpSummary,
};
