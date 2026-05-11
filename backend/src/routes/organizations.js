const express = require('express');
const router = express.Router();
const {
  getOrganizations, getOrganization, createOrganization,
  updateOrganization, updateStatus, deleteOrganization, getPlatformStats,
} = require('../controllers/organizationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('superadmin')); // Only superadmin

router.get('/stats',  getPlatformStats);
router.get('/',       getOrganizations);
router.get('/:id',    getOrganization);
router.post('/',      createOrganization);
router.put('/:id',    updateOrganization);
router.put('/:id/status', updateStatus);
router.delete('/:id', deleteOrganization);

module.exports = router;
