const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      enum: ['admin', 'reseller', 'user'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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
roleSchema.index({ name: 1 });
roleSchema.index({ priority: 1 });
roleSchema.index({ deletedAt: 1 });

// Static methods
roleSchema.statics.getDefaultPermissions = function(roleName) {
  const permissions = {
    admin: [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'user:suspend',
      'user:activate',
      'device:read',
      'device:update',
      'device:delete',
      'device:lock',
      'device:unlock',
      'device:lost_mode',
      'license:create',
      'license:read',
      'license:update',
      'license:delete',
      'pin:create',
      'pin:read',
      'pin:revoke',
      'settings:read',
      'settings:update',
      'audit:read',
      'monitoring:camera',
      'monitoring:screen',
      'monitoring:sms',
      'monitoring:gallery',
      'data:sync',
      'data:backup',
      'data:restore',
    ],
    reseller: [
      'user:create',
      'user:read',
      'user:update',
      'device:read',
      'device:update',
      'device:lock',
      'device:unlock',
      'device:lost_mode',
      'license:read',
      'pin:create',
      'pin:read',
      'monitoring:camera',
      'monitoring:screen',
      'monitoring:sms',
      'monitoring:gallery',
      'data:sync',
    ],
    user: [
      'device:read',
      'device:update',
      'device:lock',
      'device:unlock',
      'monitoring:camera',
      'monitoring:screen',
      'monitoring:sms',
      'monitoring:gallery',
      'data:sync',
    ],
  };
  return permissions[roleName] || [];
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
