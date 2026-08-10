const githubRepository = require('../../repositories/github.repository');

class NoteService {
  async readNote(path) {
    return await githubRepository.getFile(path);
  }

  async saveNote(path, content, sha) {
    return await githubRepository.updateFile(path, content, `Obsidian Note Update: ${path}`, sha);
  }
}

module.exports = new NoteService();
