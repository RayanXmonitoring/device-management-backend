const User = require('../models/User');
const Device = require('../models/Device');
const License = require('../models/License');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const isAdmin = user.role === 'admin';

    // Build queries based on role
    const userQuery = isAdmin ? {} : { userId };

    // Get device stats
    const deviceStats = await Device.aggregate([
      { $match: { deletedAt: null, ...(isAdmin ? {} : { userId }) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDevices = deviceStats.reduce((sum, stat) => sum + stat.count, 0);
    const onlineDevices = deviceStats.find(s => s._id === 'online')?.count || 0;
    const offlineDevices = deviceStats.find(s => s._id === 'offline')?.count || 0;
    const lostDevices = deviceStats.find(s => s._id === 'lost')?.count || 0;
    const maintenanceDevices = deviceStats.find(s => s._id === 'maintenance')?.count || 0;

    // Get user stats (admin only)
    let userStats = null;
    if (isAdmin) {
      const totalUsers = await User.countDocuments({ deletedAt: null });
      const activeUsers = await User.countDocuments({ status: 'active', deletedAt: null });
      const suspendedUsers = await User.countDocuments({ status: 'suspended', deletedAt: null });
      const pendingUsers = await User.countDocuments({ status: 'pending', deletedAt: null });

      userStats = {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        pending: pendingUsers,
      };
    }

    // Get license stats
    let licenseStats = null;
    if (isAdmin) {
      const totalLicenses = await License.countDocuments({ deletedAt: null });
      const activeLicenses = await License.countDocuments({ isActive: true, deletedAt: null });
      const expiredLicenses = await License.countDocuments({ 
        isActive: true, 
        expiryDate: { $lt: new Date() },
        deletedAt: null,
      });
      const expiringLicenses = await License.countDocuments({
        isActive: true,
        expiryDate: { 
          $gt: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        deletedAt: null,
      });

      licenseStats = {
        total: totalLicenses,
        active: activeLicenses,
        expired: expiredLicenses,
        expiring: expiringLicenses,
      };
    }

    // Get recent activities
    const recentActivities = await ActivityLog.find(userQuery)
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .populate('deviceId', 'name deviceId');

    // Get device status distribution
    const statusDistribution = deviceStats.map(stat => ({
      status: stat._id || 'unknown',
      count: stat.count,
    }));

    // Get device types
    const deviceTypes = await Device.aggregate([
      { $match: { deletedAt: null, ...(isAdmin ? {} : { userId }) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent notifications (for current user)
    const recentNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadNotifications = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: offlineDevices,
          lost: lostDevices,
          maintenance: maintenanceDevices,
          statusDistribution,
          deviceTypes,
        },
        ...(userStats && { users: userStats }),
        ...(licenseStats && { licenses: licenseStats }),
        recentActivities: recentActivities.map(activity => ({
          id: activity._id,
          user: activity.userId ? activity.userId.name : 'Unknown',
          action: activity.action,
          details: activity.details,
          timestamp: activity.timestamp,
          status: activity.status,
        })),
        notifications: {
          recent: recentNotifications,
          unread: unreadNotifications,
        },
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
    });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const userId = req.userId;
    const user = await User.findById(userId);

    const query = user.role === 'admin' ? {} : { userId };

    const activities = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('deviceId', 'name deviceId');

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity logs',
    });
  }
};

exports.getDeviceStats = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    const query = user.role === 'admin' ? {} : { userId };

    // Get daily device activity for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyStats = await Device.aggregate([
      { $match: { deletedAt: null, ...query } },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' },
            day: { $dayOfMonth: '$updatedAt' },
          },
          count: { $sum: 1 },
          online: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] },
          },
          offline: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({
      success: true,
      data: dailyStats,
    });
  } catch (error) {
    logger.error('Get device stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device statistics',
    });
  }
};
