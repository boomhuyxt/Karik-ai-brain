const logger = require('../utils/logger');

class AnalyticsJob {
  async run() {
    logger.info('[Background Job] Aggregating daily token and cost analytics...');
  }
}

module.exports = new AnalyticsJob();
