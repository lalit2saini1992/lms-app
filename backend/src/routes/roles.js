const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect, requirePermission } = require('../middleware/auth');

router.use(protect);

router.get('/',     getRoles);
router.post('/',    requirePermission('canManageUsers'), createRole);
router.put('/:id',  requirePermission('canManageUsers'), updateRole);
router.delete('/:id', requirePermission('canManageUsers'), deleteRole);

module.exports = router;
