const mongoose = require('mongoose');

const enrollmentPinSchema = new mongoose.Schema(
  {
    pin: {
      type: String,
      required: [true, 'PIN is required'],
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usedAt: {
      type: Date,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
    },
    maxUses: {
      type: Number,
      default: 1,
    },
    useCount: {
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
enrollmentPinSchema.index({ pin: 1 });
enrollmentPinSchema.index({ userId: 1 });
enrollmentPinSchema.index({ expiresAt: 1 });
enrollmentPinSchema.index({ isActive: 1 });
enrollmentPinSchema.index({ deletedAt: 1 });

// Instance methods
enrollmentPinSchema.methods.isExpired = function() {
  return new Date(this.expiresAt) < new Date();
};

enrollmentPinSchema.methods.isValid = function() {
  return this.isActive && !this.isExpired() && this.useCount < this.maxUses;
};

enrollmentPinSchema.methods.use = function(deviceId) {
  if (!this.isValid()) {
    throw new Error('PIN is invalid or expired');
  }
  
  this.useCount += 1;
  this.usedAt = new Date();
  this.usedBy = deviceId;
  
  if (this.useCount >= this.maxUses) {
    this.isActive = false;
  }
  
  return this.save();
};

// Static methods
enrollmentPinSchema.statics.findValid = function() {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    deletedAt: null,
  });
};

enrollmentPinSchema.statics.findExpired = function() {
  return this.find({
    isActive: true,
    expiresAt: { $lt: new Date() },
    deletedAt: null,
  });
};

enrollmentPinSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() },
    },
    {
      isActive: false,
    }
  );
  return result;
};

const EnrollmentPin = mongoose.model('EnrollmentPin', enrollmentPinSchema);

module.exports = EnrollmentPin;
