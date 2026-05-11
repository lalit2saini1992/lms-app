const Organization = require('../models/Organization');
const User = require('../models/User');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Plan = require('../models/Plan');
const { calcExpiry, DURATION_MONTHS } = require('./planController');

// @desc  Get all organizations (superadmin only)
// @route GET /api/organizations
const getOrganizations = async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (plan)   filter.plan   = plan;
    if (search) filter.name   = { $regex: search, $options: 'i' };

    const orgs = await Organization.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach live counts
    const orgsWithCounts = await Promise.all(orgs.map(async (org) => {
      const [employees, leads] = await Promise.all([
        User.countDocuments({ organization: org._id, isActive: true, role: { $ne: 'orgadmin' } }),
        Lead.countDocuments({ organization: org._id, isActive: true }),
      ]);
      return { ...org.toObject(), currentEmployees: employees, currentLeads: leads };
    }));

    res.json({ success: true, count: orgs.length, organizations: orgsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single organization
// @route GET /api/organizations/:id
const getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).populate('createdBy', 'name email');
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const [employees, leads, admins] = await Promise.all([
      User.countDocuments({ organization: org._id, isActive: true, role: { $ne: 'orgadmin' } }),
      Lead.countDocuments({ organization: org._id, isActive: true }),
      User.find({ organization: org._id, role: 'orgadmin' }).select('name email phone isActive'),
    ]);

    res.json({ success: true, organization: { ...org.toObject(), currentEmployees: employees, currentLeads: leads }, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create organization + org admin user
// @route POST /api/organizations
const createOrganization = async (req, res) => {
  try {
    const {
      name, email, phone, address,
      planId, planDuration,
      adminName, adminEmail, adminPassword, notes,
    } = req.body;

    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'name, email, adminName, adminEmail, adminPassword are required' });
    }

    // Get plan details
    let maxEmployees = 5, maxLeads = 500, planName = 'Basic', expiresAt;
    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        maxEmployees = plan.maxEmployees;
        maxLeads     = plan.maxLeads;
        planName     = plan.name;
      }
    }

    // Calculate expiry from duration
    const duration = planDuration || 'yearly';
    expiresAt = calcExpiry(duration);

    // Generate unique slug
    let slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await Organization.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    // Check admin email not taken
    const emailTaken = await User.findOne({ email: adminEmail });
    if (emailTaken) return res.status(400).json({ success: false, message: 'Admin email already in use' });

    // Create org
    const org = await Organization.create({
      name, slug, email, phone, address,
      plan: planId || null,
      planName, planDuration: duration,
      maxEmployees, maxLeads,
      expiresAt,
      adminEmail, adminName, notes,
      status: 'active',
      createdBy: req.user._id,
    });

    // Create org admin user
    const orgAdmin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'orgadmin',
      organization: org._id,
      phone: phone || '',
    });
    orgAdmin.permissions = {
      canAddLead: true, canEditLead: true, canDeleteLead: true,
      canAssignLead: true, canImportLead: true, canViewReports: true,
      canManageUsers: true, canManageFollowupTypes: true,
    };
    await orgAdmin.save();

    res.status(201).json({
      success: true,
      organization: org,
      admin: { name: orgAdmin.name, email: orgAdmin.email },
      message: `Organization "${name}" created. Admin: ${adminEmail} / ${adminPassword}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update organization
// @route PUT /api/organizations/:id
const updateOrganization = async (req, res) => {
  try {
    const { name, email, phone, address, plan, expiresAt, status, notes, maxEmployees, maxLeads } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    if (name)        org.name        = name;
    if (email)       org.email       = email;
    if (phone)       org.phone       = phone;
    if (address)     org.address     = address;
    if (plan)        org.plan        = plan;
    if (expiresAt)   org.expiresAt   = expiresAt;
    if (status)      org.status      = status;
    if (notes)       org.notes       = notes;
    if (maxEmployees) org.maxEmployees = maxEmployees;
    if (maxLeads)    org.maxLeads    = maxLeads;

    await org.save();
    res.json({ success: true, organization: org });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Suspend / Activate organization
// @route PUT /api/organizations/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const org = await Organization.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Deactivate all users if suspended
    if (status === 'suspended') {
      await User.updateMany({ organization: org._id, role: { $ne: 'orgadmin' } }, { isActive: false });
    } else if (status === 'active') {
      await User.updateMany({ organization: org._id }, { isActive: true });
    }

    res.json({ success: true, organization: org, message: `Organization ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete organization (and all data)
// @route DELETE /api/organizations/:id
const deleteOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Delete all related data
    await Promise.all([
      User.deleteMany({ organization: org._id }),
      Lead.deleteMany({ organization: org._id }),
      FollowUp.deleteMany({ organization: org._id }),
    ]);
    await org.deleteOne();

    res.json({ success: true, message: 'Organization and all data deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get org dashboard stats (for superadmin)
// @route GET /api/organizations/stats
const getPlatformStats = async (req, res) => {
  try {
    const [totalOrgs, activeOrgs, trialOrgs, suspendedOrgs, totalUsers, totalLeads] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'trial' }),
      Organization.countDocuments({ status: 'suspended' }),
      User.countDocuments({ organization: { $ne: null } }),
      Lead.countDocuments({ organization: { $ne: null } }),
    ]);

    const planDist = await Organization.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    // Expiring in 7 days
    const expiringSoon = await Organization.countDocuments({
      status: { $in: ['active', 'trial'] },
      expiresAt: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), $gte: new Date() },
    });

    res.json({
      success: true,
      stats: { totalOrgs, activeOrgs, trialOrgs, suspendedOrgs, totalUsers, totalLeads, expiringSoon, planDist },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getOrganizations, getOrganization, createOrganization, updateOrganization, updateStatus, deleteOrganization, getPlatformStats };
