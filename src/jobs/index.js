const cron = require('node-cron');
const cleanupJob = require('./cleanupJob');
const licenseCheckJob = require('./licenseCheckJob');
const backupJob = require('./backupJob');
const logger = require('../utils/logger');

class JobScheduler {
  constructor() {
    this.jobs = [];
  }

  // Initialize all scheduled jobs
  init() {
    try {
      // Run cleanup job every day at 2 AM
      const cleanupTask = cron.schedule('0 2 * * *', async () => {
        logger.info('Running cleanup job...');
        try {
          await cleanupJob.run();
          logger.info('Cleanup job completed successfully');
        } catch (error) {
          logger.error('Cleanup job failed:', error);
        }
      });
      this.jobs.push(cleanupTask);

      // Run license check every 6 hours
      const licenseTask = cron.schedule('0 */6 * * *', async () => {
        logger.info('Running license check job...');
        try {
          await licenseCheckJob.run();
          logger.info('License check job completed successfully');
        } catch (error) {
          logger.error('License check job failed:', error);
        }
      });
      this.jobs.push(licenseTask);

      // Run backup job every day at 3 AM
      const backupTask = cron.schedule('0 3 * * *', async () => {
        logger.info('Running backup job...');
        try {
          await backupJob.run();
          logger.info('Backup job completed successfully');
        } catch (error) {
          logger.error('Backup job failed:', error);
        }
      });
      this.jobs.push(backupTask);

      logger.info(`Job scheduler initialized with ${this.jobs.length} jobs`);
      return this.jobs;
    } catch (error) {
      logger.error('Job scheduler initialization failed:', error);
      throw error;
    }
  }

  // Stop all jobs
  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('All jobs stopped');
  }

  // Get job status
  getStatus() {
    return this.jobs.map(job => ({
      running: job.running,
      lastExecution: job.lastExecution,
    }));
  }
}

module.exports = new JobScheduler();
