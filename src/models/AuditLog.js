const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    action: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
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
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ ipAddress: 1 });
auditLogSchema.index({ statusCode: 1 });
auditLogSchema.index({ createdAt: 1 });
auditLogSchema.index({ deletedAt: 1 });

// Instance methods
auditLogSchema.methods.getSummary = function() {
  return {
    id: this._id,
    userId: this.userId,
    userEmail: this.userEmail,
    action: this.action,
    resource: this.resource,
    method: this.method,
    statusCode: this.statusCode,
    timestamp: this.createdAt,
  };
};

// Static methods
auditLogSchema.statics.log = async function(data) {
  const log = new this({
    ...data,
    userEmail: data.userEmail || '',
    userRole: data.userRole || 'user',
    ipAddress: data.ipAddress || 'unknown',
  });
  await log.save();
  return log;
};

auditLogSchema.statics.findByUser = function(userId, limit = 100, offset = 0) {
  return this.find({
    userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
};

auditLogSchema.statics.findByAction = function(action, limit = 100) {
  return this.find({
    action,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByResource = function(resource, resourceId, limit = 100) {
  return this.find({
    resource,
    resourceId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

auditLogSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
  return stats;
};

auditLogSchema.statics.cleanup = async function(days = 90) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await this.deleteMany({
    createdAt: { $lt: cutoff },
    deletedAt: null,
  });
  return result;
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
