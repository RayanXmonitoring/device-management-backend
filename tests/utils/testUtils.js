const mongoose = require('mongoose');

// Mock request object
const mockRequest = (options = {}) => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    ip: options.ip || '127.0.0.1',
    userId: options.userId || 'mockUserId',
    user: options.user || {
      _id: 'mockUserId',
      role: 'user',
      email: 'test@example.com',
    },
  };
};

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Create test user
const createTestUser = async (userData = {}) => {
  const User = require('../../src/models/User');
  const user = new User({
    name: userData.name || 'Test User',
    email: userData.email || 'test@example.com',
    password: userData.password || 'Password123',
    role: userData.role || 'user',
    status: 'active',
    isVerified: true,
    license: {
      type: 'user_30days',
      isActive: true,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    ...userData,
  });
  await user.save();
  return user;
};

// Generate test token
const generateTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Clear database
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// Close database connection
const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

module.exports = {
  mockRequest,
  mockResponse,
  createTestUser,
  generateTestToken,
  clearDatabase,
  closeDatabase,
};
