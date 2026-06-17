const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
      maxlength: [100, 'Device name cannot exceed 100 characters'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'lost', 'maintenance'],
      default: 'offline',
    },
    lostMode: {
      active: { type: Boolean, default: false },
      activatedAt: Date,
      message: String,
      contactInfo: String,
    },
    type: {
      type: String,
      enum: ['android', 'ios', 'windows', 'macos', 'web'],
      required: true,
    },
    model: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    osVersion: {
      type: String,
      trim: true,
    },
    appVersion: {
      type: String,
      trim: true,
    },
    enrollmentPin: {
      type: String,
      required: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      address: String,
      accuracy: Number,
      lastUpdated: Date,
    },
    battery: {
      level: Number,
      isCharging: Boolean,
      lastUpdated: Date,
    },
    storage: {
      total: Number,
      used: Number,
      free: Number,
      lastUpdated: Date,
    },
    network: {
      type: String,
      ssid: String,
      signalStrength: Number,
      lastUpdated: Date,
    },
    security: {
      isEncrypted: Boolean,
      hasPasscode: Boolean,
      lastUpdated: Date,
    },
    permissions: {
      camera: { type: Boolean, default: false },
      microphone: { type: Boolean, default: false },
      location: { type: Boolean, default: false },
      storage: { type: Boolean, default: false },
      notifications: { type: Boolean, default: false },
      accessibility: { type: Boolean, default: false },
    },
    settings: {
      backupEnabled: { type: Boolean, default: true },
      syncInterval: { type: Number, default: 3600 },
      autoLock: { type: Boolean, default: false },
      screenshotAllowed: { type: Boolean, default: true },
    },
    metadata: {
      registeredIP: String,
      registeredAt: Date,
      lastIP: String,
      lastUserAgent: String,
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
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ userId: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ enrollmentPin: 1 });
deviceSchema.index({ 'location.coordinates': '2dsphere' });
deviceSchema.index({ deletedAt: 1 });

// Instance methods
deviceSchema.methods.updateLocation = async function (coordinates, address, accuracy) {
  this.location = {
    type: 'Point',
    coordinates: [coordinates.longitude, coordinates.latitude],
    address,
    accuracy,
    lastUpdated: new Date(),
  };
  await this.save();
};

deviceSchema.methods.updateBattery = async function (level, isCharging) {
  this.battery = {
    level,
    isCharging,
    lastUpdated: new Date(),
  };
  await this.save();
};

deviceSchema.methods.updateStatus = async function (status) {
  this.status = status;
  this.lastSeen = new Date();
  await this.save();
};

deviceSchema.methods.activateLostMode = async function (message, contactInfo) {
  this.lostMode = {
    active: true,
    activatedAt: new Date(),
    message,
    contactInfo,
  };
  this.status = 'lost';
  await this.save();
};

deviceSchema.methods.deactivateLostMode = async function () {
  this.lostMode = {
    active: false,
    activatedAt: null,
    message: null,
    contactInfo: null,
  };
  this.status = 'offline';
  await this.save();
};

// Static methods
deviceSchema.statics.findByUserId = function (userId) {
  return this.find({ userId, deletedAt: null });
};

deviceSchema.statics.findOnline = function () {
  return this.find({ status: 'online', deletedAt: null });
};

deviceSchema.statics.findLost = function () {
  return this.find({ 'lostMode.active': true, deletedAt: null });
};

deviceSchema.statics.findInactive = function (minutes = 30) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({
    status: 'online',
    lastSeen: { $lt: cutoff },
    deletedAt: null,
  });
};

// Transform to JSON
deviceSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.enrollmentPin;
    delete ret.__v;
    return ret;
  },
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
