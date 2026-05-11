const Plan = require('../models/Plan');

const DURATION_MONTHS = {
  quarterly:  3,
  halfYearly: 6,
  yearly:     12,
  threeYears: 36,
};

// @desc  Get all plans
// @route GET /api/plans
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create plan
// @route POST /api/plans
const createPlan = async (req, res) => {
  try {
    const { name, description, maxEmployees, maxLeads, pricing, color, isDefault } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Plan name is required' });

    if (isDefault) await Plan.updateMany({}, { isDefault: false });

    const plan = await Plan.create({
      name, description, maxEmployees, maxLeads, pricing, color,
      isDefault: isDefault || false,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update plan
// @route PUT /api/plans/:id
const updatePlan = async (req, res) => {
  try {
    const { isDefault } = req.body;
    if (isDefault) await Plan.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });

    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete plan
// @route DELETE /api/plans/:id
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper — calculate expiry date from duration
const calcExpiry = (duration) => {
  const months = DURATION_MONTHS[duration] || 12;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

module.exports = { getPlans, createPlan, updatePlan, deletePlan, calcExpiry, DURATION_MONTHS };
