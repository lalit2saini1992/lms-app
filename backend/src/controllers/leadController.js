const Lead = require('../models/Lead');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { createNotification } = require('./notificationController');

// @desc    Get all leads (with filters)
// @route   GET /api/leads
const getLeads = async (req, res) => {
  try {
    const { status, assignedTo, search, source, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    // Employees only see their assigned leads
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    } else {
      if (assignedTo) filter.assignedTo = assignedTo;
    }

    if (status) filter.status = status;
    if (source) filter.source = source;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email');

    if (!lead || !lead.isActive) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create lead
// @route   POST /api/leads
const createLead = async (req, res) => {
  try {
    const { name, phone, email, source, notes, address, city, product, budget, assignedTo } = req.body;

    const lead = await Lead.create({
      name, phone, email, source: source || 'manual',
      notes, address, city, product, budget,
      assignedTo: assignedTo || null,
      status: assignedTo ? 'assigned' : 'new',
      createdBy: req.user._id,
    });

    const populated = await lead.populate('assignedTo', 'name email');
    res.status(201).json({ success: true, lead: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead || !lead.isActive) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const allowedFields = ['name', 'phone', 'email', 'source', 'status', 'notes', 'address', 'city', 'product', 'budget', 'nextFollowUpDate'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) lead[field] = req.body[field];
    });

    await lead.save();
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign lead to user
// @route   PUT /api/leads/:id/assign
const assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead || !lead.isActive) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.assignedTo = assignedTo;
    lead.status = 'assigned';
    await lead.save();

    const populated = await lead.populate('assignedTo', 'name email phone');

    // Send notification to assigned employee
    await createNotification({
      userId: assignedTo,
      title: 'New Lead Assigned',
      message: `Lead "${lead.name}" (${lead.phone}) has been assigned to you`,
      type: 'lead_assigned',
      link: `/leads/${lead._id}`,
      createdBy: req.user._id,
    });

    res.json({ success: true, lead: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete lead (soft delete)
// @route   DELETE /api/leads/:id
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.isActive = false;
    await lead.save();

    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Import leads from Excel
// @route   POST /api/leads/import
const importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    const importBatch = `import_${Date.now()}`;
    const leads = rows.map((row) => ({
      name: row['Name'] || row['name'] || '',
      phone: String(row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || ''),
      email: row['Email'] || row['email'] || '',
      source: 'excel',
      notes: row['Notes'] || row['notes'] || row['Remarks'] || '',
      address: row['Address'] || row['address'] || '',
      city: row['City'] || row['city'] || '',
      product: row['Product'] || row['product'] || '',
      budget: row['Budget'] || row['budget'] || '',
      createdBy: req.user._id,
      importBatch,
    })).filter((l) => l.name && l.phone);

    if (!leads.length) {
      return res.status(400).json({ success: false, message: 'No valid leads found. Ensure Name and Phone columns exist.' });
    }

    const inserted = await Lead.insertMany(leads);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      message: `${inserted.length} leads imported successfully`,
      count: inserted.length,
      importBatch,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getLeads, getLead, createLead, updateLead, assignLead, deleteLead, importLeads };
