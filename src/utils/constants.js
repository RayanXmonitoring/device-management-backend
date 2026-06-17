module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    RESELLER: 'reseller',
    USER: 'user',
  },

  // User statuses
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    PENDING: 'pending',
  },

  // Device statuses
  DEVICE_STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    LOST: 'lost',
    MAINTENANCE: 'maintenance',
  },

  // Device types
  DEVICE_TYPES: {
    ANDROID: 'android',
    IOS: 'ios',
    WINDOWS: 'windows',
    MACOS: 'macos',
    WEB: 'web',
  },

  // License types
  LICENSE_TYPES: {
    RESELLER: 'reseller',
    USER_1YEAR: 'user_1year',
    USER_30DAYS: 'user_30days',
  },

  // License durations in days
  LICENSE_DURATIONS: {
    RESELLER: 365,
    USER_1YEAR: 365,
    USER_30DAYS: 30,
  },

  // Notification types
  NOTIFICATION_TYPES: {
    DEVICE_ONLINE: 'device_online',
    DEVICE_OFFLINE: 'device_offline',
    DEVICE_LOST: 'device_lost',
    DEVICE_LOCKED: 'device_locked',
    DEVICE_UNLOCKED: 'device_unlocked',
    LICENSE_EXPIRING: 'license_expiring',
    LICENSE_EXPIRED: 'license_expired',
    PIN_CREATED: 'pin_created',
    PIN_USED: 'pin_used',
    USER_SUSPENDED: 'user_suspended',
    USER_ACTIVATED: 'user_activated',
    SYSTEM_MAINTENANCE: 'system_maintenance',
    BACKUP_COMPLETED: 'backup_completed',
    BACKUP_FAILED: 'backup_failed',
    SYNC_COMPLETED: 'sync_completed',
    SYNC_FAILED: 'sync_failed',
    SECURITY_ALERT: 'security_alert',
    CUSTOM: 'custom',
  },

  // Notification priorities
  NOTIFICATION_PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // Notification channels
  NOTIFICATION_CHANNELS: {
    EMAIL: 'email',
    PUSH: 'push',
    IN_APP: 'in-app',
    SMS: 'sms',
  },

  // Activity log actions
  ACTIVITY_ACTIONS: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    DEVICE_REGISTER: 'device_register',
    DEVICE_UPDATE: 'device_update',
    DEVICE_DELETE: 'device_delete',
    DEVICE_LOCK: 'device_lock',
    DEVICE_UNLOCK: 'device_unlock',
    LOST_MODE_ACTIVATE: 'lost_mode_activate',
    LOST_MODE_DEACTIVATE: 'lost_mode_deactivate',
    DATA_SYNC: 'data_sync',
    DATA_BACKUP: 'data_backup',
    DATA_RESTORE: 'data_restore',
    USER_CREATE: 'user_create',
    USER_UPDATE: 'user_update',
    USER_DELETE: 'user_delete',
    USER_SUSPEND: 'user_suspend',
    USER_ACTIVATE: 'user_activate',
    LICENSE_UPDATE: 'license_update',
    PIN_CREATE: 'pin_create',
    PIN_VERIFY: 'pin_verify',
    SETTINGS_UPDATE: 'settings_update',
    CAMERA_ACCESS: 'camera_access',
    SCREEN_ACCESS: 'screen_access',
    SMS_ACCESS: 'sms_access',
    GALLERY_ACCESS: 'gallery_access',
    BROWSER_ARTIFACTS_ACCESS: 'browser_artifacts_access',
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Cache
  CACHE: {
    DEVICE_TTL: 300, // 5 minutes
    USER_TTL: 600, // 10 minutes
    STATS_TTL: 60, // 1 minute
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
  },

  // File upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },

  // Default system settings
  DEFAULT_SETTINGS: {
    siteName: 'Device Management System',
    maintenance: false,
    registrationEnabled: true,
    maxDevicesPerUser: 5,
    sessionTimeout: 3600,
    backupEnabled: true,
    backupInterval: 86400,
    encryptionEnabled: true,
    auditLogEnabled: true,
    emailNotifications: true,
    pushNotifications: true,
  },
};
