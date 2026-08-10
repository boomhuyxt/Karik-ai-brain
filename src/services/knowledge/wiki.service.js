const wikiRepository = require('../../repositories/wiki.repository');
const searchService = require('./search.service');

class WikiService {
  async getWikiNote(id) {
    return await wikiRepository.findById(id);
  }

  async getAllNotes() {
    return await wikiRepository.findAll();
  }

  async searchWiki(query) {
    return await searchService.vectorSearch(query);
  }
}

module.exports = new WikiService();
