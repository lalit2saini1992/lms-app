const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database
 * @param {Object} params
 * @param {string} params.action - Action type (from ActivityLog enum)
 * @param {Object} params.performedBy - User object (req.user)
 * @param {string} [params.targetId] - ID of affected entity
 * @param {string} [params.targetType] - Type of entity ('Lead', 'User', etc.)
 * @param {string} [params.targetName] - Human-readable name
 * @param {Object} [params.details] - Extra details
 * @param {string} [params.ip] - IP address
 */
const logActivity = async ({ action, performedBy, targetId, targetType, targetName, details, ip }) => {
  try {
    await ActivityLog.create({
      action,
      performedBy: performedBy._id || performedBy,
      organization: performedBy.organization || null,
      targetId:   targetId   || null,
      targetType: targetType || null,
      targetName: targetName || null,
      details:    details    || {},
      ip:         ip         || null,
    });
  } catch (err) {
    // Never crash the main request due to logging failure
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
