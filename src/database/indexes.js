const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Create indexes for all models
const createIndexes = async () => {
  try {
    // User indexes
    const User = require('../models/User');
    await User.createIndexes();
    logger.info('User indexes created');

    // Device indexes
    const Device = require('../models/Device');
    await Device.createIndexes();
    logger.info('Device indexes created');

    // ActivityLog indexes
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.createIndexes();
    logger.info('ActivityLog indexes created');

    // Role indexes
    const Role = require('../models/Role');
    await Role.createIndexes();
    logger.info('Role indexes created');

    // License indexes
    const License = require('../models/License');
    await License.createIndexes();
    logger.info('License indexes created');

    // EnrollmentPin indexes
    const EnrollmentPin = require('../models/EnrollmentPin');
    await EnrollmentPin.createIndexes();
    logger.info('EnrollmentPin indexes created');

    // Notification indexes
    const Notification = require('../models/Notification');
    await Notification.createIndexes();
    logger.info('Notification indexes created');

    // SystemSetting indexes
    const SystemSetting = require('../models/SystemSetting');
    await SystemSetting.createIndexes();
    logger.info('SystemSetting indexes created');

    // AuditLog indexes
    const AuditLog = require('../models/AuditLog');
    await AuditLog.createIndexes();
    logger.info('AuditLog indexes created');

    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    throw error;
  }
};

// Drop all indexes (use with caution)
const dropAllIndexes = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const name in collections) {
      await collections[name].dropIndexes();
      logger.info(`Dropped indexes for collection: ${name}`);
    }
    logger.info('All indexes dropped');
  } catch (error) {
    logger.error('Error dropping indexes:', error);
    throw error;
  }
};

module.exports = {
  createIndexes,
  dropAllIndexes,
};
