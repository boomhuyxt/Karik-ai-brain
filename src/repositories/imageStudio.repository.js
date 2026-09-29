const { supabase } = require('../config/supabase');

class ImageStudioRepository {
  constructor() {
    this.profiles = new Map();
    this.history = new Map();
  }

  async getProfile(userId) {
    if (supabase) {
      const { data, error } = await supabase.from('image_studio_profiles').select('preferences').eq('user_id', userId).maybeSingle();
      if (!error && data) return data.preferences || {};
    }
    return this.profiles.get(userId) || {};
  }

  async saveProfile(userId, preferences) {
    this.profiles.set(userId, preferences);
    if (supabase) {
      const { error } = await supabase.from('image_studio_profiles').upsert({
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) console.warn('[ImageStudioRepository] Profile sync notice:', error.message);
    }
    return preferences;
  }

  async getHistory(userId, limit = 12) {
    if (supabase) {
      const { data, error } = await supabase
        .from('image_studio_history')
        .select('style, layout, palette, signature, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) return data.reverse();
    }
    return (this.history.get(userId) || []).slice(-limit);
  }

  async addHistory(userId, design) {
    const entry = {
      style: design.style,
      layout: design.layout,
      palette: design.palette,
      signature: design.signature,
      created_at: new Date().toISOString()
    };
    const current = (this.history.get(userId) || []).filter(item => item.signature !== entry.signature);
    current.push(entry);
    this.history.set(userId, current.slice(-12));

    if (supabase) {
      const { error } = await supabase.from('image_studio_history').insert({ user_id: userId, ...entry });
      if (error) console.warn('[ImageStudioRepository] History sync notice:', error.message);
    }
    return entry;
  }
}

module.exports = new ImageStudioRepository();
