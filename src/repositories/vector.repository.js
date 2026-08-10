const { supabase } = require('../config/supabase');

class VectorRepository {
  async saveEmbedding(item) {
    if (!supabase) return { ...item, id: item.id || 'vec_mock_1' };
    const { data, error } = await supabase.from('embeddings').upsert(item).select().single();
    if (error) throw error;
    return data;
  }

  async search(queryVector, limit = 5) {
    if (!supabase) {
      return [
        { id: 'chunk_1', content: 'Clean Architecture rules in AI Brain OS', similarity: 0.92 },
        { id: 'chunk_2', content: 'Obsidian markdown repository sync process', similarity: 0.88 }
      ];
    }
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryVector,
      match_threshold: 0.7,
      match_count: limit
    });
    if (error) throw error;
    return data;
  }
}

module.exports = new VectorRepository();
