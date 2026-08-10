const generateId = (prefix = 'id') => `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatCost = (amount) => `$${Number(amount || 0).toFixed(6)}`;

module.exports = {
  generateId,
  sleep,
  formatCost
};
