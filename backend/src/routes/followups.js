const express = require('express');
const router = express.Router();
const {
  getFollowUpTypes, createFollowUpType, updateFollowUpType, deleteFollowUpType,
  getFollowUps, createFollowUp, getFollowUpSummary,
} = require('../controllers/followUpController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

// Follow-up types
router.get('/types', getFollowUpTypes);
router.post('/types', requirePermission('canManageFollowupTypes'), createFollowUpType);
router.put('/types/:id', requirePermission('canManageFollowupTypes'), updateFollowUpType);
router.delete('/types/:id', requirePermission('canManageFollowupTypes'), deleteFollowUpType);

// Follow-ups
router.get('/', getFollowUps);
router.post('/', createFollowUp);
router.get('/summary', requirePermission('canViewReports'), getFollowUpSummary);

module.exports = router;
