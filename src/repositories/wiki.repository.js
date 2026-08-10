const { supabase } = require('../config/supabase');

class WikiRepository {
  async findById(id) {
    if (!supabase) return { id, title: 'Sample Wiki Note', content: '# Sample Note' };
    const { data, error } = await supabase.from('wikis').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async findAll() {
    if (!supabase) return [{ id: '1', title: 'AI Architecture', path: 'Wiki/AI Architecture.md' }];
    const { data, error } = await supabase.from('wikis').select('*');
    if (error) throw error;
    return data;
  }

  async save(wikiData) {
    if (!supabase) return { ...wikiData, id: wikiData.id || 'wiki_mock_1' };
    const { data, error } = await supabase.from('wikis').upsert(wikiData).select().single();
    if (error) throw error;
    return data;
  }
}

module.exports = new WikiRepository();
