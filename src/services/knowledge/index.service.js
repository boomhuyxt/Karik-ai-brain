const markdownService = require('./markdown.service');
const chunkService = require('./chunk.service');
const embeddingService = require('./embedding.service');
const vectorRepository = require('../../repositories/vector.repository');

class IndexService {
  async indexGithubFile(filePath) {
    const md = await markdownService.getMarkdownFile(filePath);
    const chunks = chunkService.chunkText(md.body);

    for (const chunk of chunks) {
      const vector = await embeddingService.generateEmbedding(chunk.content);
      await vectorRepository.saveEmbedding({
        path: filePath,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: vector,
        metadata: md.metadata
      });
    }

    return { status: 'indexed', path: filePath, chunkCount: chunks.length };
  }
}

module.exports = new IndexService();
