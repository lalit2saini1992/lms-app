const express = require('express');
const router = express.Router();
const { getStats, getChartData, getActivity } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { orgScope } = require('../middleware/orgIsolation');

router.use(protect);
router.use(orgScope); // Apply org isolation so dashboard only shows current org's data

router.get('/stats', getStats);
router.get('/chart', getChartData);
router.get('/activity', getActivity);

module.exports = router;
