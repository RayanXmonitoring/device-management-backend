const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['admin', 'reseller', 'user'],
      default: 'user',
    },
    license: {
      type: {
        type: String,
        enum: ['reseller', 'user_1year', 'user_30days'],
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
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'pending',
    },
    pin: {
      type: String,
      select: false,
    },
    pinCreated: {
      type: Date,
    },
    deviceLimit: {
      type: Number,
      default: 5,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
    },
    metadata: {
      lastIP: String,
      lastUserAgent: String,
      registrationIP: String,
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
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });
userSchema.index({ 'license.expiryDate': 1 });
userSchema.index({ status: 1 });
userSchema.index({ deletedAt: 1 });

// Pre-save middleware
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Set license expiry date
  if (this.isModified('license.type')) {
    const duration = {
      reseller: 365,
      user_1year: 365,
      user_30days: 30,
    };
    const days = duration[this.license.type] || 30;
    this.license.expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLicenseValid = function () {
  if (!this.license || !this.license.isActive) return false;
  return new Date(this.license.expiryDate) > new Date();
};

userSchema.methods.isLocked = function () {
  if (!this.lockUntil) return false;
  return this.lockUntil > new Date();
};

userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 15;

  this.loginAttempts += 1;

  if (this.loginAttempts >= MAX_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCKOUT_DURATION * 60 * 1000);
  }

  await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email, deletedAt: null });
};

userSchema.statics.findActive = function () {
  return this.find({ status: 'active', deletedAt: null });
};

userSchema.statics.findExpiringLicenses = function (days = 30) {
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    'license.isActive': true,
    'license.expiryDate': { $lte: futureDate, $gt: new Date() },
    deletedAt: null,
  });
};

// Virtuals
userSchema.virtual('isAdmin').get(function () {
  return this.role === 'admin';
});

userSchema.virtual('isReseller').get(function () {
  return this.role === 'reseller';
});

userSchema.virtual('licenseDaysRemaining').get(function () {
  if (!this.license || !this.license.isActive) return 0;
  const diff = this.license.expiryDate - new Date();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
});

// Transform to JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.pin;
    delete ret.verificationToken;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
