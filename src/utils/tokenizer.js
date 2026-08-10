/**
 * Approximates token count for standard LLM models (~4 characters per token)
 */
const countTokens = (text = '') => {
  if (typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
};

module.exports = {
  countTokens
};
