const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        'device_online',
        'device_offline',
        'device_lost',
        'device_locked',
        'device_unlocked',
        'license_expiring',
        'license_expired',
        'pin_created',
        'pin_used',
        'user_suspended',
        'user_activated',
        'system_maintenance',
        'backup_completed',
        'backup_failed',
        'sync_completed',
        'sync_failed',
        'security_alert',
        'custom',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    channels: {
      type: [String],
      enum: ['email', 'push', 'in-app', 'sms'],
      default: ['in-app'],
    },
    expiresAt: {
      type: Date,
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
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ deletedAt: 1 });

// Instance methods
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

notificationSchema.methods.markAsDelivered = async function() {
  this.isDelivered = true;
  this.deliveredAt = new Date();
  await this.save();
  return this;
};

notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date(this.expiresAt) < new Date();
};

// Static methods
notificationSchema.statics.findUnread = function(userId) {
  return this.find({
    userId,
    isRead: false,
    deletedAt: null,
  }).sort({ createdAt: -1 });
};

notificationSchema.statics.findRecent = function(userId, limit = 10) {
  return this.find({
    userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  const result = await this.updateMany(
    {
      userId,
      isRead: false,
      deletedAt: null,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
  return result;
};

notificationSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      isRead: true,
    },
    {
      deletedAt: new Date(),
    }
  );
  return result;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
