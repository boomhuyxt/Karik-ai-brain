const routerService = require('./router.service');
const tokenService = require('./token.service');
const costService = require('./cost.service');
const conversationService = require('./conversation.service');

const geminiService = require('../providers/gemini.service');
const openaiService = require('../providers/openai.service');
const groqService = require('../providers/groq.service');
const claudeService = require('../providers/claude.service');
const openrouterService = require('../providers/openrouter.service');

const knowledgePipelineService = require('../knowledge/knowledgePipeline.service');

class AIManagerService {
  constructor() {
    this.providers = {
      gemini: geminiService,
      openai: openaiService,
      groq: groqService,
      claude: claudeService,
      openrouter: openrouterService
    };
  }

  async processRequest(prompt, category = '', options = {}) {
    // 1. Select optimal provider
    const targetProvider = options.provider || routerService.selectProvider(prompt, category);
    const providerInstance = this.providers[targetProvider] || geminiService;

    // 2. Add to conversation history
    conversationService.addMessage('user', prompt, targetProvider);

    // 3. Dispatch to selected AI provider (with auto fallback to Gemini if mock or failed)
    let chatResult = await providerInstance.chat(prompt, options);
    let reply = typeof chatResult === 'object' && chatResult !== null ? (chatResult.text || '') : chatResult;

    if ((!reply || reply.includes('Mock Response')) && targetProvider !== 'gemini') {
      console.warn(`⚠️ [Router]: Provider ${targetProvider} returned mock/empty response. Falling back to Gemini...`);
      chatResult = await geminiService.chat(prompt, options);
      reply = typeof chatResult === 'object' && chatResult !== null ? (chatResult.text || '') : chatResult;
    }

    const rawUsage = typeof chatResult === 'object' && chatResult !== null ? chatResult.usage : null;
    const audioData = typeof chatResult === 'object' && chatResult !== null ? chatResult.audioData : null;
    const mimeType = typeof chatResult === 'object' && chatResult !== null ? chatResult.mimeType : null;
    const voice = typeof chatResult === 'object' && chatResult !== null ? chatResult.voice : null;

    // 4. Automatic Knowledge Pipeline (Asynchronous Background Execution for instant response)
    (async () => {
      try {
        const topic = knowledgePipelineService.extractTopic(prompt);
        if (knowledgePipelineService.isLearnIntent(prompt)) {
          await knowledgePipelineService.digestToWiki(topic, prompt, reply, providerInstance);
        } else {
          await knowledgePipelineService.saveRawKnowledge(topic, prompt, reply);
        }
      } catch (err) {
        console.warn('[KnowledgePipeline Background Error]:', err.message);
      }
    })();

    // 5. Record token usage & cost
    const tokenStats = await tokenService.trackTokens(targetProvider, prompt, reply, rawUsage);
    const estimatedCost = costService.calculateCost(
      targetProvider,
      tokenStats.inputTokens,
      tokenStats.outputTokens
    );

    // 6. Save assistant reply
    conversationService.addMessage('assistant', reply, targetProvider);

    return {
      reply,
      audioData,
      mimeType,
      voice,
      provider: targetProvider,
      tokens: tokenStats,
      cost: estimatedCost,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };
  }
}

module.exports = new AIManagerService();
