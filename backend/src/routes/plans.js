const express = require('express');
const router = express.Router();
const { getPlans, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getPlans); // All logged-in users can see plans
router.post('/',    authorize('superadmin'), createPlan);
router.put('/:id',  authorize('superadmin'), updatePlan);
router.delete('/:id', authorize('superadmin'), deletePlan);

module.exports = router;
