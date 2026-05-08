const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser, resetPassword } = require('../controllers/userController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

router.get('/', requirePermission('canManageUsers'), getUsers);
router.get('/:id', requirePermission('canManageUsers'), getUser);
router.post('/', requirePermission('canManageUsers'), createUser);
router.put('/:id', requirePermission('canManageUsers'), updateUser);
router.delete('/:id', requirePermission('canManageUsers'), deleteUser);
router.put('/:id/reset-password', requirePermission('canManageUsers'), resetPassword);

module.exports = router;
