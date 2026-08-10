const embeddingService = require('./embedding.service');
const vectorRepository = require('../../repositories/vector.repository');

class SearchService {
  async vectorSearch(query, limit = 5) {
    const vector = await embeddingService.generateEmbedding(query);
    return await vectorRepository.search(vector, limit);
  }
}

module.exports = new SearchService();
