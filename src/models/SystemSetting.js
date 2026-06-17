const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    // General Settings
    siteName: {
      type: String,
      default: 'Device Management System',
    },
    siteDescription: {
      type: String,
      default: 'Manage and monitor devices',
    },
    maintenance: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'System is under maintenance. Please try again later.',
    },

    // Registration & Security
    registrationEnabled: {
      type: Boolean,
      default: true,
    },
    maxDevicesPerUser: {
      type: Number,
      default: 5,
    },
    sessionTimeout: {
      type: Number,
      default: 3600, // seconds
    },
    requireTwoFactor: {
      type: Boolean,
      default: false,
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
      },
      requireUppercase: {
        type: Boolean,
        default: true,
      },
      requireLowercase: {
        type: Boolean,
        default: true,
      },
      requireNumbers: {
        type: Boolean,
        default: true,
      },
      requireSpecialChars: {
        type: Boolean,
        default: false,
      },
    },

    // Backup & Sync
    backupEnabled: {
      type: Boolean,
      default: true,
    },
    backupInterval: {
      type: Number,
      default: 86400, // seconds
    },
    backupRetentionDays: {
      type: Number,
      default: 30,
    },
    syncEnabled: {
      type: Boolean,
      default: true,
    },
    syncInterval: {
      type: Number,
      default: 3600, // seconds
    },

    // Security
    encryptionEnabled: {
      type: Boolean,
      default: true,
    },
    auditLogEnabled: {
      type: Boolean,
      default: true,
    },
    auditLogRetentionDays: {
      type: Number,
      default: 90,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
    },
    lockoutDuration: {
      type: Number,
      default: 15, // minutes
    },

    // Notifications
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    notificationRetentionDays: {
      type: Number,
      default: 30,
    },

    // Features
    deviceGalleryEnabled: {
      type: Boolean,
      default: true,
    },
    smsMonitoringEnabled: {
      type: Boolean,
      default: true,
    },
    cameraAccessEnabled: {
      type: Boolean,
      default: true,
    },
    screenMonitoringEnabled: {
      type: Boolean,
      default: true,
    },
    deviceLockEnabled: {
      type: Boolean,
      default: true,
    },
    lostModeEnabled: {
      type: Boolean,
      default: true,
    },
    browserArtifactsEnabled: {
      type: Boolean,
      default: true,
    },

    // Integrations
    integrations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Custom settings
    customSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Metadata
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
systemSettingSchema.index({ maintenance: 1 });
systemSettingSchema.index({ deletedAt: 1 });

// Static methods
systemSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ deletedAt: null });
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

systemSettingSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.findOne({ deletedAt: null });
  if (!settings) {
    settings = new this();
  }

  // Update fields
  const allowedFields = Object.keys(this.schema.paths);
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
      settings[key] = value;
    }
  }

  settings.updatedBy = userId;
  await settings.save();
  return settings;
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;
