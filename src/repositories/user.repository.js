const { supabase } = require('../config/supabase');
const { generateToken, hashPassword } = require('../utils/crypto');

class UserRepository {
  constructor() {
    this.memoryUsers = new Map();

    // Root Admin System Account
    const rootAdmin = {
      id: 'usr_admin',
      email: 'adminAI@ai-brain.local',
      fullName: 'Root Admin',
      passwordHash: hashPassword('admin123456'),
      role: '1',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.memoryUsers.set('adminai@ai-brain.local', rootAdmin);
    this.memoryUsers.set('admin@ai-brain.local', { ...rootAdmin, email: 'admin@ai-brain.local' });
    this.memoryUsers.set('adminai', { ...rootAdmin, email: 'adminai' });
  }

  async findByEmail(email) {
    const key = (email || '').toLowerCase().trim();
    let user = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', key).maybeSingle();
        if (!error && data) {
          const rawRole = (data.role !== undefined && data.role !== null && data.role !== '') 
            ? data.role 
            : ((data.role_id !== undefined && data.role_id !== null && data.role_id !== '') ? data.role_id : '0');
          user = {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName || 'User',
            passwordHash: data.password_hash || data.password,
            role: String(rawRole),
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

    // Apply memory status, role and password override for Root Admin and active users
    const memUser = this.memoryUsers.get(key);
    if (user && memUser) {
      if (memUser.status) user.status = memUser.status;
      if (memUser.role !== undefined) user.role = String(memUser.role);
      if (memUser.passwordHash && (key === 'adminai@ai-brain.local' || key === 'admin@ai-brain.local' || key === 'adminai')) {
        user.passwordHash = memUser.passwordHash;
      }
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
      if (memUser) {
        if (memUser.status) user.status = memUser.status;
        if (memUser.role !== undefined) user.role = String(memUser.role);
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
      let insertObj = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.fullName,
        password_hash: newUser.passwordHash,
        role: newUser.role,
        role_id: newUser.role,
        created_at: newUser.createdAt
      };

      let res = await supabase.from('users').insert([ insertObj ]).select().single();

      if (res.error && res.error.message.includes('role_id')) {
        delete insertObj.role_id;
        res = await supabase.from('users').insert([ insertObj ]).select().single();
      }

      if (res.error && res.error.message.includes('status')) {
        delete insertObj.status;
        res = await supabase.from('users').insert([ insertObj ]).select().single();
      }

      if (res.error) {
        console.error('[UserRepository] Supabase insert failed:', res.error.message);
        throw new Error(`Lỗi lưu vào Supabase Database: ${res.error.message}`);
      }

      if (res.data) {
        newUser.id = res.data.id;
      }
    } else {
      throw new Error('Chưa kết nối được tới cơ sở dữ liệu Supabase.');
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

    // Apply memory status & role overrides if present
    for (const user of usersList) {
      const memUser = this.memoryUsers.get((user.email || '').toLowerCase());
      if (memUser) {
        if (memUser.status) user.status = memUser.status;
        if (memUser.role !== undefined) user.role = String(memUser.role);
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

  async updateUserRole(userId, role) {
    let validRole = '0';
    const r = String(role || '').toLowerCase();
    if (r === '1' || r === 'admin') validRole = '1';
    else if (r === '2' || r === 'post_office' || r === 'buu_cuc') validRole = '2';

    if (supabase) {
      try {
        let res = await supabase.from('users').update({ role: validRole, role_id: validRole }).eq('id', userId).select();
        if (res.error || !res.data || res.data.length === 0) {
          await supabase.from('users').update({ role: validRole, role_id: validRole }).eq('email', userId);
        }
      } catch (err) {
        console.warn('[UserRepository] Supabase updateUserRole notice:', err.message);
      }
    }

    // Update in memory users map
    let foundInMem = false;
    for (const [key, memUser] of this.memoryUsers.entries()) {
      if (memUser && (memUser.id === userId || key === userId || (memUser.email && memUser.email.toLowerCase() === String(userId).toLowerCase()))) {
        memUser.role = validRole;
        this.memoryUsers.set(key, { ...memUser, role: validRole });
        foundInMem = true;
      }
    }

    // If user is from Supabase and not in memoryUsers Map yet, fetch & store role override
    if (!foundInMem) {
      const user = (await this.findById(userId)) || (await this.findByEmail(userId));
      if (user) {
        user.role = validRole;
        this.memoryUsers.set((user.email || '').toLowerCase(), { ...user, role: validRole });
      }
    }

    return true;
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
