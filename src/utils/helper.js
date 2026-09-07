const generateId = (prefix = 'id') => `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatCost = (amount) => `$${Number(amount || 0).toFixed(6)}`;

const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const [localPart, domain] = email.trim().split('@');
  if (localPart.length <= 2) {
    return `****@${domain}`;
  }
  return `****${localPart.slice(-2)}@${domain}`;
};

module.exports = {
  generateId,
  sleep,
  formatCost,
  maskEmail
};
