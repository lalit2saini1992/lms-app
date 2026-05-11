const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getLeads, getLead, createLead, updateLead, assignLead, deleteLead, importLeads } = require('../controllers/leadController');
const { protect, requirePermission } = require('../middleware/auth');
const { orgScope, checkLeadLimit } = require('../middleware/orgIsolation');

// Multer config for Excel uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `leads_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .xls and .xlsx files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(protect);
router.use(orgScope); // Apply org isolation to all lead routes

router.get('/', getLeads);
router.get('/:id', getLead);
router.post('/', requirePermission('canAddLead'), checkLeadLimit, createLead);
router.post('/import', requirePermission('canImportLead'), upload.single('file'), importLeads);
router.put('/:id', requirePermission('canEditLead'), updateLead);
router.put('/:id/assign', requirePermission('canAssignLead'), assignLead);
router.delete('/:id', requirePermission('canDeleteLead'), deleteLead);

module.exports = router;
