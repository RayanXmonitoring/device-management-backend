const License = require('../models/License');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { LICENSE_DURATIONS } = require('../utils/constants');
const logger = require('../utils/logger');

class LicenseService {
  // Create license
  static async createLicense(userId, type, durationDays, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const license = new License({
        userId,
        type,
        durationDays,
        expiryDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        isActive: true,
      });

      await license.save();

      // Update user license
      user.license = {
        type,
        expiryDate: license.expiryDate,
        isActive: true,
      };
      await user.save();

      // Log activity
      await ActivityLog.log({
        userId: adminId,
        action: 'license_update',
        details: { userId, type, durationDays },
      });

      return license;
    } catch (error) {
      logger.error('LicenseService.createLicense error:', error);
      throw error;
    }
  }

  // Get license by ID
  static async getLicenseById(licenseId) {
    try {
      const license = await License.findById(licenseId).populate('userId', 'name email');
      if (!license) {
        throw new Error('License not found');
      }
      return license;
    } catch (error) {
      logger.error('LicenseService.getLicenseById error:', error);
      throw error;
    }
  }

  // Get user licenses
  static async getUserLicenses(userId) {
    try {
      const licenses = await License.find({ userId, deletedAt: null })
        .sort({ createdAt: -1 });
      return licenses;
    } catch (error) {
      logger.error('LicenseService.getUserLicenses error:', error);
      throw error;
    }
  }

  // Renew license
  static async renewLicense(licenseId, days) {
    try {
      const license = await License.findById(licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      await license.renew(days);

      // Update user license
      const user = await User.findById(license.userId);
      if (user) {
        user.license.expiryDate = license.expiryDate;
        user.license.isActive = true;
        await user.save();
      }

      return license;
    } catch (error) {
      logger.error('LicenseService.renewLicense error:', error);
      throw error;
    }
  }

  // Deactivate license
  static async deactivateLicense(licenseId, reason) {
    try {
      const license = await License.findById(licenseId);
      if (!license) {
        throw new Error('License not found');
      }

      await license.deactivate(reason);

      // Update user license
      const user = await User.findById(license.userId);
      if (user) {
        user.license.isActive = false;
        await user.save();
      }

      return license;
    } catch (error) {
      logger.error('LicenseService.deactivateLicense error:', error);
      throw error;
    }
  }

  // Get expiring licenses
  static async getExpiringLicenses(days = 30) {
    try {
      const licenses = await License.findExpiring(days);
      return licenses;
    } catch (error) {
      logger.error('LicenseService.getExpiringLicenses error:', error);
      throw error;
    }
  }

  // Get expired licenses
  static async getExpiredLicenses() {
    try {
      const licenses = await License.findExpired();
      return licenses;
    } catch (error) {
      logger.error('LicenseService.getExpiredLicenses error:', error);
      throw error;
    }
  }

  // Check license validity
  static async checkLicenseValidity(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isValid = user.isLicenseValid();
      const daysRemaining = user.licenseDaysRemaining;

      return {
        isValid,
        daysRemaining,
        expiryDate: user.license?.expiryDate,
      };
    } catch (error) {
      logger.error('LicenseService.checkLicenseValidity error:', error);
      throw error;
    }
  }
}

module.exports = LicenseService;
