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
      role: '1',
      status: 'active',
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
      role: '1',
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }

  async findByEmail(email) {
    const key = (email || '').toLowerCase().trim();
    let user = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', key).maybeSingle();
        if (!error && data) {
          user = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || 'User',
            passwordHash: data.password_hash || data.password,
            role: String(data.role_id || data.role || (key.includes('admin') ? '1' : '0')),
            status: data.status || 'active',
            createdAt: data.created_at
          };
        } else if (error) {
          console.warn('[UserRepository] Supabase findByEmail notice:', error.message);
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase query notice:', err.message);
      }
    }

    if (!user) {
      user = this.memoryUsers.get(key) || null;
    }

    // Apply memory status override if present
    const memUser = this.memoryUsers.get(key);
    if (user && memUser && memUser.status) {
      user.status = memUser.status;
    }

    return user;
  }

  async findById(id) {
    let user = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          user = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || 'User',
            role: String(data.role_id || data.role || '0'),
            status: data.status || 'active',
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase findById notice:', err.message);
      }
    }

    if (!user) {
      for (const u of this.memoryUsers.values()) {
        if (u.id === id) {
          user = u;
          break;
        }
      }
    }

    if (user) {
      const memUser = this.memoryUsers.get((user.email || '').toLowerCase());
      if (memUser && memUser.status) {
        user.status = memUser.status;
      }
    }

    return user;
  }

  async createUser({ email, passwordHash, fullName, role = '0' }) {
    const newUser = {
      id: `usr_${generateToken(8)}`,
      email: email.toLowerCase(),
      fullName: fullName || 'User',
      passwordHash,
      role: String(role || '0'),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        let insertObj = {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.fullName,
          password_hash: newUser.passwordHash,
          role: newUser.role,
          status: newUser.status,
          created_at: newUser.createdAt
        };

        let res = await supabase.from('users').insert([ { ...insertObj, role_id: newUser.role } ]).select().single();
        
        if (res.error && (res.error.message.includes('role_id') || res.error.message.includes('status'))) {
          delete insertObj.status;
          res = await supabase.from('users').insert([ insertObj ]).select().single();
        }

        if (!res.error && res.data) {
          newUser.id = res.data.id;
        } else if (res.error) {
          console.warn('[UserRepository] Supabase insert notice:', res.error.message);
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

  async findAllUsers() {
    let usersList = [];

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          usersList = data.map(item => ({
            id: item.id,
            email: item.email,
            fullName: item.full_name || item.fullName || 'User',
            role: String(item.role_id || item.role || '0'),
            status: item.status || 'active',
            createdAt: item.created_at
          }));
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase findAllUsers notice:', err.message);
      }
    }

    // Apply memory status overrides if present
    for (const user of usersList) {
      const memUser = this.memoryUsers.get((user.email || '').toLowerCase());
      if (memUser && memUser.status) {
        user.status = memUser.status;
      }
    }

    // Merge memory users if not already present
    const existingIds = new Set(usersList.map(u => u.id));
    for (const memUser of this.memoryUsers.values()) {
      if (!existingIds.has(memUser.id)) {
        usersList.push({
          id: memUser.id,
          email: memUser.email,
          fullName: memUser.fullName,
          role: String(memUser.role || '0'),
          status: memUser.status || 'active',
          createdAt: memUser.createdAt
        });
        existingIds.add(memUser.id);
      }
    }

    // Calculate Statistics
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter(u => u.status !== 'blocked').length;
    const blockedUsers = usersList.filter(u => u.status === 'blocked').length;

    return {
      users: usersList,
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers
      }
    };
  }

  async updateUserStatus(userId, status) {
    const validStatus = status === 'blocked' ? 'blocked' : 'active';

    if (supabase) {
      try {
        const res = await supabase.from('users').update({ status: validStatus }).eq('id', userId).select();
        if (res.error) {
          console.warn('[UserRepository] Supabase updateUserStatus notice:', res.error.message);
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase updateUserStatus notice:', err.message);
      }
    }

    // Update in memory users map
    let foundInMem = false;
    for (const [key, memUser] of this.memoryUsers.entries()) {
      if (memUser.id === userId) {
        memUser.status = validStatus;
        this.memoryUsers.set(key, memUser);
        foundInMem = true;
      }
    }

    // If user is from Supabase and not in memoryUsers Map yet, fetch & store status override
    if (!foundInMem) {
      const user = await this.findById(userId);
      if (user) {
        user.status = validStatus;
        this.memoryUsers.set((user.email || '').toLowerCase(), user);
      }
    }

    return true;
  }

  async deleteUser(userId) {
    if (supabase) {
      try {
        await supabase.from('users').delete().eq('id', userId);
      } catch (err) {
        console.warn('[UserRepository] Supabase deleteUser notice:', err.message);
      }
    }

    for (const [key, memUser] of this.memoryUsers.entries()) {
      if (memUser.id === userId) {
        this.memoryUsers.delete(key);
      }
    }

    return true;
  }

  async cleanTestUsers() {
    let deletedCount = 0;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('users')
          .delete()
          .or('email.ilike.test_%,email.ilike.%@example.com')
          .select();
        if (data) {
          deletedCount += data.length;
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase cleanTestUsers notice:', err.message);
      }
    }

    for (const [key, memUser] of this.memoryUsers.entries()) {
      const email = (memUser.email || '').toLowerCase();
      if (email.startsWith('test_') || email.endsWith('@example.com') || email.includes('test_admin_user')) {
        this.memoryUsers.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = new UserRepository();
