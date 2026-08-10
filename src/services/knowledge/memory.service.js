const memoryRepository = require('../../repositories/memory.repository');

class MemoryService {
  async saveUserMemory(userId, key, value) {
    return await memoryRepository.saveMemory({
      user_id: userId,
      key,
      value,
      updated_at: new Date().toISOString()
    });
  }

  async getUserMemories(userId) {
    return await memoryRepository.getMemories(userId);
  }
}

module.exports = new MemoryService();
