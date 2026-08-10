const repositoryService = require('./repository.service');

class CommitService {
  async autoCommitNote(filePath, content, message) {
    return await repositoryService.saveMarkdown(filePath, content);
  }
}

module.exports = new CommitService();
