const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32chars';

// Global setup
beforeAll(async () => {
  // Connect to test database
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test';
  await mongoose.connect(testDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Global teardown
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// Clear collections between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

module.exports = {
  // Export utilities for tests
  createTestUser: async (userData = {}) => {
    const User = require('../src/models/User');
    const user = new User({
      name: userData.name || 'Test User',
      email: userData.email || 'test@example.com',
      password: userData.password || 'Test@123456',
      role: userData.role || 'user',
      status: 'active',
      isVerified: true,
      license: {
        type: userData.licenseType || 'user_30days',
        isActive: true,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      ...userData,
    });
    await user.save();
    return user;
  },

  generateTestToken: (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  generateTestDevice: async (userId, deviceData = {}) => {
    const Device = require('../src/models/Device');
    const device = new Device({
      deviceId: deviceData.deviceId || 'TEST-DEVICE-001',
      name: deviceData.name || 'Test Device',
      userId,
      type: deviceData.type || 'android',
      status: 'online',
      ...deviceData,
    });
    await device.save();
    return device;
  },
};
