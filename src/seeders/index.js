const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const SystemSetting = require('../models/SystemSetting');
const { ROLES, USER_STATUS, LICENSE_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');

class Seeder {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      this.connection = mongoose.connection;
      logger.info('Connected to MongoDB for seeding');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('MongoDB disconnection error:', error);
      throw error;
    }
  }

  async seedRoles() {
    try {
      const roles = [
        {
          name: ROLES.ADMIN,
          displayName: 'Administrator',
          description: 'Full system access',
          isSystem: true,
          priority: 100,
        },
        {
          name: ROLES.RESELLER,
          displayName: 'Reseller',
          description: 'Can manage users and devices',
          isSystem: true,
          priority: 50,
        },
        {
          name: ROLES.USER,
          displayName: 'User',
          description: 'Basic user access',
          isSystem: true,
          priority: 10,
        },
      ];

      for (const roleData of roles) {
        const existing = await Role.findOne({ name: roleData.name });
        if (!existing) {
          await Role.create(roleData);
          logger.info(`Role ${roleData.name} created`);
        } else {
          logger.info(`Role ${roleData.name} already exists`);
        }
      }
    } catch (error) {
      logger.error('Seed roles error:', error);
      throw error;
    }
  }

  async seedAdminUser() {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@device-management.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const admin = new User({
          name: 'System Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: ROLES.ADMIN,
          status: USER_STATUS.ACTIVE,
          license: {
            type: LICENSE_TYPES.RESELLER,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
          isVerified: true,
          deviceLimit: 100,
        });

        await admin.save();
        logger.info(`Admin user created: ${adminEmail}`);
      } else {
        logger.info('Admin user already exists');
      }
    } catch (error) {
      logger.error('Seed admin user error:', error);
      throw error;
    }
  }

  async seedSystemSettings() {
    try {
      const existingSettings = await SystemSetting.findOne();
      if (!existingSettings) {
        const settings = new SystemSetting({
          siteName: 'Device Management System',
          siteDescription: 'Manage and monitor devices',
          maintenance: false,
          registrationEnabled: true,
          maxDevicesPerUser: 5,
          sessionTimeout: 3600,
          backupEnabled: true,
          backupInterval: 86400,
          backupRetentionDays: 30,
          encryptionEnabled: true,
          auditLogEnabled: true,
          auditLogRetentionDays: 90,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          emailNotifications: true,
          pushNotifications: true,
          notificationRetentionDays: 30,
          deviceGalleryEnabled: true,
          smsMonitoringEnabled: true,
          cameraAccessEnabled: true,
          screenMonitoringEnabled: true,
          deviceLockEnabled: true,
          lostModeEnabled: true,
          browserArtifactsEnabled: true,
        });
        await settings.save();
        logger.info('System settings created');
      } else {
        logger.info('System settings already exist');
      }
    } catch (error) {
      logger.error('Seed system settings error:', error);
      throw error;
    }
  }

  async run() {
    try {
      logger.info('Starting database seeding...');
      await this.connect();
      await this.seedRoles();
      await this.seedAdminUser();
      await this.seedSystemSettings();
      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run seeder if script is executed directly
if (require.main === module) {
  const seeder = new Seeder();
  seeder.run()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = Seeder;
