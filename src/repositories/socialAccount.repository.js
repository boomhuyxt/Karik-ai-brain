const { supabase } = require('../config/supabase');

class SocialAccountRepository {
  constructor() {
    this.inMemoryStore = new Map();
  }

  async findById(id) {
    if (!supabase) {
      return this.inMemoryStore.get(id) || null;
    }
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async findByUserId(userId) {
    if (!supabase) {
      return Array.from(this.inMemoryStore.values()).filter(acc => acc.user_id === userId);
    }
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findAdminAccounts() {
    if (!supabase) {
      return Array.from(this.inMemoryStore.values()).filter(acc => acc.account_type === 'admin_system');
    }
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('account_type', 'admin_system')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async save(account) {
    const record = {
      ...account,
      id: account.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      updated_at: new Date().toISOString()
    };

    if (!supabase) {
      this.inMemoryStore.set(record.id, record);
      return record;
    }

    const { data, error } = await supabase
      .from('social_accounts')
      .upsert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id) {
    if (!supabase) {
      return this.inMemoryStore.delete(id);
    }
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

module.exports = new SocialAccountRepository();
