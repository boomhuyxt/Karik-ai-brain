const { supabase } = require('../config/supabase');

class UserRepository {
  async findByEmail(email) {
    if (!supabase) return { id: 'usr_1', email, name: 'AI Admin' };
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error) throw error;
    return data;
  }
}

module.exports = new UserRepository();
