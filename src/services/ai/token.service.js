const { countTokens } = require('../../utils/tokenizer');
const tokenRepository = require('../../repositories/token.repository');

class TokenService {
  async trackTokens(provider, inputPrompt, outputResponse, rawUsage = null) {
    const inputTokens = rawUsage?.inputTokens ?? countTokens(inputPrompt);
    const outputTokens = rawUsage?.outputTokens ?? countTokens(outputResponse);
    const totalTokens = rawUsage?.totalTokens ?? (inputTokens + outputTokens);

    await tokenRepository.recordUsage({
      provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      created_at: new Date().toISOString()
    });

    return { inputTokens, outputTokens, totalTokens };
  }

  async getUsageSummary() {
    return await tokenRepository.getSummary();
  }
}

module.exports = new TokenService();

