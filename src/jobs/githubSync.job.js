const logger = require('../utils/logger');
const syncService = require('../services/github/sync.service');

class GithubSyncJob {
  async run() {
    logger.info('[Background Job] Starting GitHub Vault Sync routine...');
    try {
      const result = await syncService.syncRepositoryToSupabase(['Wiki/AI Architecture.md']);
      logger.info('[Background Job] GitHub Sync complete.', result);
    } catch (err) {
      logger.error('[Background Job] GitHub Sync failed:', err.message);
    }
  }
}

module.exports = new GithubSyncJob();
