const logger = require('../utils/logger');

class EmbeddingJob {
  async run() {
    logger.info('[Background Job] Running batch embedding optimization...');
  }
}

module.exports = new EmbeddingJob();
