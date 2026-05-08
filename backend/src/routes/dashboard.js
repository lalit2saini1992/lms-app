const express = require('express');
const router = express.Router();
const { getStats, getChartData, getActivity } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/chart', getChartData);
router.get('/activity', getActivity);

module.exports = router;
