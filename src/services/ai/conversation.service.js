class ConversationService {
  constructor() {
    this.history = [];
  }

  addMessage(role, content, provider = 'system') {
    const entry = { id: Date.now(), role, content, provider, timestamp: new Date().toISOString() };
    this.history.push(entry);
    return entry;
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }
}

module.exports = new ConversationService();
