const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class BackupJob {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async run() {
    try {
      const settings = await SystemSetting.getSettings();
      
      if (!settings.backupEnabled) {
        logger.info('Backup is disabled, skipping...');
        return { success: false, message: 'Backup disabled' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.dump`);

      // Get MongoDB URI
      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME || 'device_management';

      // Create backup using mongodump
      const command = `mongodump --uri="${mongoUri}" --db="${dbName}" --archive="${backupFile}" --gzip`;
      
      logger.info(`Starting backup to ${backupFile}`);
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('Backup stderr:', stderr);
      }

      // Cleanup old backups
      await this.cleanupOldBackups(settings.backupRetentionDays || 30);

      logger.info(`Backup completed: ${backupFile}`);
      return {
        success: true,
        file: backupFile,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Backup job error:', error);
      throw error;
    }
  }

  async cleanupOldBackups(retentionDays) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          fs.unlinkSync(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Cleanup old backups error:', error);
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter(file => file.endsWith('.dump'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          size: fs.statSync(path.join(this.backupDir, file)).size,
          created: fs.statSync(path.join(this.backupDir, file)).mtime,
        }))
        .sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('List backups error:', error);
      return [];
    }
  }

  async restoreBackup(backupFile) {
    try {
      const mongoUri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME || 'device_management';

      const command = `mongorestore --uri="${mongoUri}" --db="${dbName}" --archive="${backupFile}" --gzip --drop`;
      
      logger.info(`Starting restore from ${backupFile}`);
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('Restore stderr:', stderr);
      }

      logger.info(`Restore completed: ${backupFile}`);
      return {
        success: true,
        file: backupFile,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Restore backup error:', error);
      throw error;
    }
  }
}

module.exports = new BackupJob();
