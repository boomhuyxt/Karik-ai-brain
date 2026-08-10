const { supabase } = require('../config/supabase');

class PromptRepository {
  async getPromptByName(name) {
    if (!supabase) return { name, template: 'System prompt content for {{name}}' };
    const { data, error } = await supabase.from('prompts').select('*').eq('name', name).single();
    if (error) throw error;
    return data;
  }
}

module.exports = new PromptRepository();
