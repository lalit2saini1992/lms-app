const express = require('express');
const router = express.Router();
const {
  getNotifications, markRead, markAllRead, deleteNotification, clearAll,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',                  getNotifications);
router.put('/read-all',          markAllRead);
router.delete('/clear-all',      clearAll);
router.put('/:id/read',          markRead);
router.delete('/:id',            deleteNotification);

module.exports = router;
