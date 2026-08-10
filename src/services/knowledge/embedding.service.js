const { getEmbedding } = require('../../providers/gemini/embedding');

class EmbeddingService {
  async generateEmbedding(text) {
    return await getEmbedding(text);
  }
}

module.exports = new EmbeddingService();
