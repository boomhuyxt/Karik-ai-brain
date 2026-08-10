const githubRepository = require('../../repositories/github.repository');

class RepositoryService {
  async getMarkdown(filePath) {
    return await githubRepository.getFile(filePath);
  }

  async saveMarkdown(filePath, content, sha) {
    return await githubRepository.updateFile(filePath, content, `AI Brain Sync: ${filePath}`, sha);
  }
}

module.exports = new RepositoryService();
