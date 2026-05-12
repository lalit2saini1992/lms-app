const express = require('express');
const router = express.Router();
const {
  getOrganizations, getOrganization, createOrganization,
  updateOrganization, updateStatus, deleteOrganization, getPlatformStats,
} = require('../controllers/organizationController');
const { protect, authorize, requirePermission } = require('../middleware/auth');

router.use(protect);

// Allow superadmin OR users with canManageOrganizations permission
const canAccessOrgs = (req, res, next) => {
  if (req.user.role === 'superadmin' || req.user.permissions?.canManageOrganizations) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Not authorized to manage organizations' });
};

router.get('/stats',      canAccessOrgs, getPlatformStats);
router.get('/',           canAccessOrgs, getOrganizations);
router.get('/:id',        canAccessOrgs, getOrganization);
router.post('/',          authorize('superadmin'), createOrganization);      // only superadmin can create
router.put('/:id',        canAccessOrgs, updateOrganization);
router.put('/:id/status', authorize('superadmin'), updateStatus);            // only superadmin can suspend/activate
router.delete('/:id',     authorize('superadmin'), deleteOrganization);      // only superadmin can delete

module.exports = router;
