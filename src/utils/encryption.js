const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars';
const IV_LENGTH = 16;

// Generate random token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Encrypt data
const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Decrypt data
const decrypt = (text) => {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Generate HMAC
const generateHmac = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

// Verify HMAC
const verifyHmac = (data, hmac, secret) => {
  const computedHmac = generateHmac(data, secret);
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(computedHmac));
};

// Generate API key
const generateApiKey = () => {
  return `dev_${generateToken(32)}`;
};

// Generate random PIN
const generatePin = (length = 6) => {
  return crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, '0');
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  encrypt,
  decrypt,
  generateHmac,
  verifyHmac,
  generateApiKey,
  generatePin,
};
