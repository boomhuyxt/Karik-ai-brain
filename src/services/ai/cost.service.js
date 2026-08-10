class CostService {
  calculateCost(provider, inputTokens, outputTokens) {
    const rates = {
      gemini: { input: 0.00000125, output: 0.000005 },
      openai: { input: 0.0000025, output: 0.00001 },
      groq: { input: 0.00000059, output: 0.00000079 },
      claude: { input: 0.000003, output: 0.000015 },
      openrouter: { input: 0.000002, output: 0.000008 }
    };

    const rate = rates[provider] || rates.gemini;
    const cost = inputTokens * rate.input + outputTokens * rate.output;
    return Number(cost.toFixed(6));
  }
}

module.exports = new CostService();
