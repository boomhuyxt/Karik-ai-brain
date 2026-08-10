const indexService = require('../knowledge/index.service');

class SyncService {
  async syncRepositoryToSupabase(filePaths = []) {
    const results = [];
    for (const path of filePaths) {
      try {
        const res = await indexService.indexGithubFile(path);
        results.push(res);
      } catch (err) {
        results.push({ path, status: 'failed', error: err.message });
      }
    }
    return { syncedCount: results.length, details: results };
  }
}

module.exports = new SyncService();
