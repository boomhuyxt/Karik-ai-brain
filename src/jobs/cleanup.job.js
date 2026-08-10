const logger = require('../utils/logger');

class CleanupJob {
  async run() {
    logger.info('[Background Job] Purging temporary storage cache...');
  }
}

module.exports = new CleanupJob();
