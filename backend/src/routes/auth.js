const express = require('express');
const router = express.Router();
const { login, getMe, seedAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/seed', seedAdmin); // Run once to create first admin

module.exports = router;
