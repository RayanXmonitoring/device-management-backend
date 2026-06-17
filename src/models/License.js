const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['reseller', 'user_1year', 'user_30days'],
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
    maxDevices: {
      type: Number,
      default: 5,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    deactivatedAt: {
      type: Date,
    },
    deactivationReason: {
      type: String,
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
licenseSchema.index({ userId: 1 });
licenseSchema.index({ expiryDate: 1 });
licenseSchema.index({ isActive: 1 });
licenseSchema.index({ type: 1 });
licenseSchema.index({ deletedAt: 1 });

// Instance methods
licenseSchema.methods.isExpired = function() {
  return new Date(this.expiryDate) < new Date();
};

licenseSchema.methods.getDaysRemaining = function() {
  if (this.isExpired()) return 0;
  const diff = this.expiryDate - new Date();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

licenseSchema.methods.renew = function(days) {
  this.expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  this.isActive = true;
  return this.save();
};

licenseSchema.methods.deactivate = function(reason) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  return this.save();
};

// Static methods
licenseSchema.statics.findExpiring = function(days = 30) {
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    isActive: true,
    expiryDate: { $lte: futureDate, $gt: new Date() },
    deletedAt: null,
  }).populate('userId', 'name email');
};

licenseSchema.statics.findExpired = function() {
  return this.find({
    isActive: true,
    expiryDate: { $lt: new Date() },
    deletedAt: null,
  }).populate('userId', 'name email');
};

const License = mongoose.model('License', licenseSchema);

module.exports = License;
