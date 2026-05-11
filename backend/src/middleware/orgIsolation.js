const Organization = require('../models/Organization');

// Middleware — inject organization filter into req
// Superadmin sees everything, org users see only their org data
const orgScope = async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin') {
      // Superadmin — no org filter (can see all)
      req.orgFilter = {};
      req.orgId = null;
      return next();
    }

    if (!req.user.organization) {
      // Legacy users without org — no filter
      req.orgFilter = {};
      req.orgId = null;
      return next();
    }

    // Check org is active
    const org = await Organization.findById(req.user.organization);
    if (!org) {
      return res.status(403).json({ success: false, message: 'Organization not found' });
    }
    if (org.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your organization account is suspended. Contact support.' });
    }
    if (org.status === 'expired' || (org.expiresAt && new Date() > org.expiresAt)) {
      // Auto-expire
      if (org.status !== 'expired') { org.status = 'expired'; await org.save(); }
      return res.status(403).json({ success: false, message: 'Your subscription has expired. Please renew.' });
    }

    req.orgFilter = { organization: req.user.organization };
    req.orgId     = req.user.organization;
    req.org       = org;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check employee limit before creating user
const checkEmployeeLimit = async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin' || !req.user.organization) return next();

    const org = req.org || await Organization.findById(req.user.organization);
    if (!org) return next();

    const { User } = require('../models/User');
    const count = await User.countDocuments({
      organization: org._id,
      isActive: true,
      role: { $ne: 'orgadmin' },
    });

    if (count >= org.maxEmployees) {
      return res.status(403).json({
        success: false,
        message: `Employee limit reached (${org.maxEmployees}). Upgrade your plan to add more.`,
      });
    }
    next();
  } catch (error) {
    next();
  }
};

// Check lead limit before creating lead
const checkLeadLimit = async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin' || !req.user.organization) return next();

    const org = req.org || await Organization.findById(req.user.organization);
    if (!org) return next();

    const Lead = require('../models/Lead');
    const count = await Lead.countDocuments({ organization: org._id, isActive: true });

    if (count >= org.maxLeads) {
      return res.status(403).json({
        success: false,
        message: `Lead limit reached (${org.maxLeads}). Upgrade your plan to add more.`,
      });
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { orgScope, checkEmployeeLimit, checkLeadLimit };
