const AuthService = require('../../src/services/authService');
const User = require('../../src/models/User');
const { mockRequest, mockResponse } = require('../utils/testUtils');

jest.mock('../../src/models/User');
jest.mock('../../src/services/auditService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        role: 'user',
        licenseType: 'user_30days',
      };

      const mockUser = {
        _id: '123456789',
        ...userData,
        toJSON: jest.fn().mockReturnValue({ ...userData, id: '123456789' }),
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(null);
      User.mockImplementation(() => mockUser);

      const result = await AuthService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      };

      User.findOne.mockResolvedValue({ _id: '123' });

      await expect(AuthService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        _id: '123456789',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
        incrementLoginAttempts: jest.fn(),
        resetLoginAttempts: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ id: '123456789', email: 'test@example.com' }),
      };

      User.findOne.mockResolvedValue(mockUser);

      const result = await AuthService.login('test@example.com', 'Password123');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('Password123');
    });

    it('should throw error if user not found', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(AuthService.login('test@example.com', 'Password123')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error if account is locked', async () => {
      const mockUser = {
        isLocked: jest.fn().mockReturnValue(true),
        lockUntil: new Date(Date.now() + 15 * 60 * 1000),
      };

      User.findOne.mockResolvedValue(mockUser);

      await expect(AuthService.login('test@example.com', 'Password123')).rejects.toThrow(
        'Account is locked'
      );
    });
  });
});
