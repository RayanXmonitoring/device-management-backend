const mongoose = require('mongoose');
const { createIndexes } = require('./indexes');
const logger = require('../utils/logger');

const initDatabase = async () => {
  try {
    // Check connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    // Create indexes
    await createIndexes();

    // Set up plugins
    mongoose.plugin((schema) => {
      // Add soft delete support
      schema.pre('find', function() {
        this.where({ deletedAt: null });
      });
      
      schema.pre('findOne', function() {
        this.where({ deletedAt: null });
      });
      
      schema.pre('countDocuments', function() {
        this.where({ deletedAt: null });
      });
    });

    logger.info('Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = { initDatabase };
