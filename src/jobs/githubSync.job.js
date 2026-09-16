class GithubSyncJob {
  async run() {
    // Disabled background sync to prevent unwanted public.embeddings schema cache errors
    return { syncedCount: 0, details: [] };
  }
}

module.exports = new GithubSyncJob();
