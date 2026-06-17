const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login',
        'logout',
        'device_register',
        'device_update',
        'device_delete',
        'device_lock',
        'device_unlock',
        'lost_mode_activate',
        'lost_mode_deactivate',
        'data_sync',
        'data_backup',
        'data_restore',
        'user_create',
        'user_update',
        'user_delete',
        'user_suspend',
        'user_activate',
        'license_update',
        'pin_create',
        'pin_verify',
        'settings_update',
        'camera_access',
        'screen_access',
        'sms_access',
        'gallery_access',
        'browser_artifacts_access',
        'password_change',
        'password_reset',
        'email_change',
        'api_access',
      ],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ deviceId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ status: 1 });
activityLogSchema.index({ timestamp: 1 });

// Static methods
activityLogSchema.statics.log = async function (data) {
  const log = new this(data);
  await log.save();
  return log;
};

activityLogSchema.statics.getUserActivities = function (userId, limit = 100, offset = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .populate('deviceId', 'name deviceId');
};

activityLogSchema.statics.getDeviceActivities = function (deviceId, limit = 100, offset = 0) {
  return this.find({ deviceId })
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .populate('userId', 'name email');
};

activityLogSchema.statics.cleanup = async function (days = 90) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({ timestamp: { $lt: cutoff } });
  return result;
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
