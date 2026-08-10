const { supabase } = require('../config/supabase');

class MemoryRepository {
  async saveMemory(memoryData) {
    if (!supabase) return { ...memoryData, id: memoryData.id || 'mem_mock_1' };
    const { data, error } = await supabase.from('memories').upsert(memoryData).select().single();
    if (error) throw error;
    return data;
  }

  async getMemories(userId) {
    if (!supabase) return [{ id: 'mem_1', key: 'user_preference', value: 'Clean Architecture' }];
    const { data, error } = await supabase.from('memories').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  async deleteMemory(id) {
    if (!supabase) return true;
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

module.exports = new MemoryRepository();
