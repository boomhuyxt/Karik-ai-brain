const { supabase } = require('../config/supabase');
const { generateToken, hashPassword } = require('../utils/crypto');

class UserRepository {
  constructor() {
    this.memoryUsers = new Map();

    const adminHash = hashPassword('admin123456');

    // Admin user 1: adminAI
    const adminUser = {
      id: 'usr_adminAI',
      email: 'adminai',
      fullName: 'AI Admin',
      passwordHash: adminHash,
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    this.memoryUsers.set('adminai', adminUser);
    this.memoryUsers.set('adminai@ai-brain.local', adminUser);

    // Admin user 2: admin@ai-brain.local
    this.memoryUsers.set('admin@ai-brain.local', {
      id: 'usr_admin',
      email: 'admin@ai-brain.local',
      fullName: 'AI Admin',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  async findByEmail(email) {
    const key = (email || '').toLowerCase().trim();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', key).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || 'User',
            passwordHash: data.password_hash || data.password,
            role: data.role || (key.includes('admin') ? 'admin' : 'user'),
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase query notice:', err.message);
      }
    }

    return this.memoryUsers.get(key) || null;
  }

  async findById(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || 'User',
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase findById notice:', err.message);
      }
    }

    for (const u of this.memoryUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  async createUser({ email, passwordHash, fullName, role = 'user' }) {
    const newUser = {
      id: `usr_${generateToken(8)}`,
      email: email.toLowerCase(),
      fullName: fullName || 'User',
      passwordHash,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              id: newUser.id,
              email: newUser.email,
              full_name: newUser.fullName,
              password_hash: newUser.passwordHash,
              role: newUser.role,
              created_at: newUser.createdAt
            }
          ])
          .select()
          .single();

        if (!error && data) {
          newUser.id = data.id;
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase insert fallback to memory:', err.message);
      }
    }

    this.memoryUsers.set(newUser.email, newUser);
    return newUser;
  }

  async updatePassword(email, newPasswordHash) {
    const key = (email || '').toLowerCase().trim();
    const user = await this.findByEmail(key);
    if (!user) return false;

    user.passwordHash = newPasswordHash;

    if (supabase) {
      try {
        await supabase.from('users').update({ password_hash: newPasswordHash }).eq('email', key);
      } catch (err) {
        console.warn('[UserRepository] Supabase updatePassword notice:', err.message);
      }
    }

    this.memoryUsers.set(key, { ...user, passwordHash: newPasswordHash });
    return true;
  }
}

module.exports = new UserRepository();
