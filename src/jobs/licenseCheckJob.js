const User = require('../models/User');
const License = require('../models/License');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class LicenseCheckJob {
  async run() {
    try {
      const results = {
        expiring: [],
        expired: [],
        updated: 0,
      };

      // Check expiring licenses (within 7 days)
      const expiringLicenses = await License.findExpiring(7);
      for (const license of expiringLicenses) {
        const user = await User.findById(license.userId);
        if (user && user.license.isActive) {
          // Send notification
          await NotificationService.sendLicenseNotification(
            user._id,
            'license_expiring',
            `Your license will expire in ${license.getDaysRemaining()} days. Please renew to continue using the service.`,
            {
              licenseId: license._id,
              expiryDate: license.expiryDate,
              daysRemaining: license.getDaysRemaining(),
            }
          );
          results.expiring.push({
            userId: user._id,
            email: user.email,
            daysRemaining: license.getDaysRemaining(),
          });
        }
      }

      // Check expired licenses
      const expiredLicenses = await License.findExpired();
      for (const license of expiredLicenses) {
        const user = await User.findById(license.userId);
        if (user && user.license.isActive) {
          // Deactivate license
          user.license.isActive = false;
          await user.save();

          // Send notification
          await NotificationService.sendLicenseNotification(
            user._id,
            'license_expired',
            'Your license has expired. Please renew to continue using the service.',
            {
              licenseId: license._id,
              expiryDate: license.expiryDate,
            }
          );
          
          results.expired.push({
            userId: user._id,
            email: user.email,
          });
          results.updated++;
        }
      }

      logger.info(`License check completed: ${results.expiring.length} expiring, ${results.expired.length} expired`);
      return results;
    } catch (error) {
      logger.error('License check job error:', error);
      throw error;
    }
  }
}

module.exports = new LicenseCheckJob();
