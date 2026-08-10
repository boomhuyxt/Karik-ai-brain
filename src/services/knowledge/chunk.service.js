class ChunkService {
  chunkText(text = '', chunkSize = 500, overlap = 50) {
    if (!text) return [];
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push({
        index: chunks.length,
        content: text.slice(start, end)
      });
      if (end >= text.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }
}

module.exports = new ChunkService();
