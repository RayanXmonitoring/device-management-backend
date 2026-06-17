const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Generate unique ID
const generateId = () => uuidv4();

// Format date
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// Calculate pagination
const getPagination = (page = 1, limit = 50) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip,
  };
};

// Get pagination metadata
const getPaginationMetadata = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};

// Validate IP address
const isValidIP = (ip) => {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Pattern.test(ip)) return false;
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
};

// Validate URL
const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Extract domain from email
const extractDomain = (email) => {
  return email.split('@')[1] || null;
};

// Mask sensitive data
const maskData = (data, fields = ['password', 'token', 'secret']) => {
  if (typeof data !== 'object' || data === null) return data;

  const masked = { ...data };
  for (const field of fields) {
    if (masked[field]) {
      masked[field] = '********';
    }
  }
  return masked;
};

// Ensure directory exists
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

// Generate filename with timestamp
const generateFilename = (originalName) => {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// Group array by key
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Sleep/Pause execution
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry operation
const retry = async (fn, retries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await sleep(delay * (i + 1));
      }
    }
  }
  throw lastError;
};

module.exports = {
  generateId,
  formatDate,
  getPagination,
  getPaginationMetadata,
  isValidIP,
  isValidURL,
  extractDomain,
  maskData,
  ensureDir,
  getFileExtension,
  generateFilename,
  calculatePercentage,
  groupBy,
  deepClone,
  sleep,
  retry,
};
