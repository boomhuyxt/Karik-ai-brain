const { supabase } = require('../config/supabase');

class SocialPostRepository {
  constructor() {
    this.inMemoryStore = new Map();
  }

  async findById(id) {
    if (!supabase) {
      return this.inMemoryStore.get(id) || null;
    }
    const { data, error } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(*)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  async findByAuthorId(authorId) {
    if (!supabase) {
      return Array.from(this.inMemoryStore.values())
        .filter(p => p.author_id === authorId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { data, error } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(*)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findDuePosts(nowDate = new Date()) {
    const isoNow = nowDate.toISOString();
    if (!supabase) {
      return Array.from(this.inMemoryStore.values()).filter(
        p => (p.status === 'SCHEDULED' || p.status === 'APPROVED') &&
             new Date(p.scheduled_at) <= nowDate
      );
    }

    const { data, error } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(*)')
      .in('status', ['SCHEDULED', 'APPROVED'])
      .lte('scheduled_at', isoNow)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findPendingApprovals() {
    if (!supabase) {
      return Array.from(this.inMemoryStore.values())
        .filter(p => p.status === 'PENDING_APPROVAL')
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    const { data, error } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(*), author:users(id, full_name, email)')
      .eq('status', 'PENDING_APPROVAL')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findFailedRetryable(maxRetries = 3) {
    if (!supabase) {
      return Array.from(this.inMemoryStore.values()).filter(
        p => p.status === 'FAILED' && (p.retry_count || 0) < maxRetries
      );
    }

    const { data, error } = await supabase
      .from('social_posts')
      .select('*, account:social_accounts(*)')
      .eq('status', 'FAILED')
      .lt('retry_count', maxRetries)
      .order('updated_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async save(post) {
    const record = {
      ...post,
      id: post.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      retry_count: post.retry_count !== undefined ? post.retry_count : 0,
      max_retries: post.max_retries !== undefined ? post.max_retries : 3,
      created_at: post.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!supabase) {
      this.inMemoryStore.set(record.id, record);
      return record;
    }

    const { data, error } = await supabase
      .from('social_posts')
      .upsert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatus(id, status, extraFields = {}) {
    const patch = {
      status,
      ...extraFields,
      updated_at: new Date().toISOString()
    };

    if (!supabase) {
      const existing = this.inMemoryStore.get(id);
      if (existing) {
        const updated = { ...existing, ...patch };
        this.inMemoryStore.set(id, updated);
        return updated;
      }
      return null;
    }

    const { data, error } = await supabase
      .from('social_posts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new SocialPostRepository();
