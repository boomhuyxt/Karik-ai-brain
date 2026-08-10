const indexService = require('../knowledge/index.service');

class WebhookService {
  async handlePushEvent(payload) {
    const commits = payload.commits || [];
    const modifiedFiles = [];

    commits.forEach((c) => {
      if (c.added) modifiedFiles.push(...c.added);
      if (c.modified) modifiedFiles.push(...c.modified);
    });

    const markdownFiles = modifiedFiles.filter((f) => f.endsWith('.md'));
    for (const file of markdownFiles) {
      await indexService.indexGithubFile(file);
    }

    return { processedFiles: markdownFiles.length };
  }
}

module.exports = new WebhookService();
