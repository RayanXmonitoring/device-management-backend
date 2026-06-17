const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class WebhookService {
  constructor() {
    this.webhooks = new Map();
  }

  // Register webhook
  registerWebhook(event, url, secret = null) {
    if (!this.webhooks.has(event)) {
      this.webhooks.set(event, []);
    }
    this.webhooks.get(event).push({ url, secret });
    logger.info(`Webhook registered for event: ${event}`);
  }

  // Unregister webhook
  unregisterWebhook(event, url) {
    if (this.webhooks.has(event)) {
      const webhooks = this.webhooks.get(event);
      const index = webhooks.findIndex(w => w.url === url);
      if (index !== -1) {
        webhooks.splice(index, 1);
        logger.info(`Webhook unregistered for event: ${event}`);
      }
    }
  }

  // Get webhooks for event
  getWebhooks(event) {
    return this.webhooks.get(event) || [];
  }

  // Send webhook
  async sendWebhook(url, data, secret = null) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add signature if secret is provided
      if (secret) {
        const signature = this.generateSignature(data, secret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await axios.post(url, data, {
        headers,
        timeout: 10000, // 10 seconds
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      logger.error(`Webhook send error to ${url}:`, error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      };
    }
  }

  // Generate webhook signature
  generateSignature(data, secret) {
    const payload = JSON.stringify(data);
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // Verify webhook signature
  verifySignature(data, signature, secret) {
    const expectedSignature = this.generateSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Emit webhook event
  async emitEvent(event, data) {
    const webhooks = this.getWebhooks(event);
    if (webhooks.length === 0) {
      return { sent: 0, results: [] };
    }

    logger.info(`Sending webhook for event ${event} to ${webhooks.length} endpoints`);

    const results = [];
    for (const webhook of webhooks) {
      const result = await this.sendWebhook(webhook.url, data, webhook.secret);
      results.push({
        url: webhook.url,
        ...result,
      });
    }

    return {
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // Default webhook events
  getDefaultEvents() {
    return [
      'device.registered',
      'device.updated',
      'device.deleted',
      'device.online',
      'device.offline',
      'device.locked',
      'device.unlocked',
      'device.lost_mode',
      'user.created',
      'user.updated',
      'user.deleted',
      'user.suspended',
      'license.created',
      'license.updated',
      'license.expired',
      'license.expiring',
    ];
  }
}

module.exports = new WebhookService();
