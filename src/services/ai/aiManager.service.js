const routerService = require('./router.service');
const tokenService = require('./token.service');
const costService = require('./cost.service');
const conversationService = require('./conversation.service');

const geminiService = require('../providers/gemini.service');
const openaiService = require('../providers/openai.service');
const groqService = require('../providers/groq.service');
const claudeService = require('../providers/claude.service');
const openrouterService = require('../providers/openrouter.service');
const tokenrouterService = require('../providers/tokenrouter.service');
const geminiImageService = require('../providers/geminiImage.service');

const knowledgePipelineService = require('../knowledge/knowledgePipeline.service');

class AIManagerService {
  constructor() {
    this.providers = {
      gemini: geminiService,
      openai: openaiService,
      groq: groqService,
      claude: claudeService,
      openrouter: openrouterService,
      tokenrouter: tokenrouterService,
      deepseek: tokenrouterService,
      'gemini-image': geminiImageService,
      gemini_image: geminiImageService,
      imagen3: geminiImageService,
      imagen: geminiImageService
    };
  }

  async processRequest(prompt, category = '', options = {}) {
    // 1. AI Karik Main Orchestrator dispatches to specialized agent
    const delegatedAgent = routerService.dispatchAgent(prompt, category);
    const targetModel = options.model || delegatedAgent.model;
    const targetProvider = options.provider || routerService.selectProvider(prompt, category);
    // 1.5. RAG Semantic Recall: Quét tri thức đã lưu trong Obsidian để nạp vào Context cho AI
    let enrichedContext = options.context || '';
    try {
      const searchService = require('../knowledge/search.service');
      const relevantNotes = await searchService.vectorSearch(prompt, 2);
      if (Array.isArray(relevantNotes) && relevantNotes.length > 0) {
        const knowledgeSnippets = relevantNotes
          .filter(n => n && n.content && !n.content.includes('File mới hoặc chưa tồn tại'))
          .map(n => `• [Obsidian Note: ${n.path || 'Tri thức'}]:\n${String(n.content).slice(0, 350)}`)
          .join('\n\n');

        if (knowledgeSnippets) {
          enrichedContext = (enrichedContext ? enrichedContext + '\n\n' : '') +
            `[TRI THỨC ĐÃ LƯU TRONG OBSIDIAN VAULT - HÃY THAM KHẢO VÀ CẢI TIẾN KHI TRẢ LỜI]:\n${knowledgeSnippets}`;
        }
      }
    } catch (ragErr) {
      // Non-blocking fallback if vector search encounters issue
    }

    // 2. AI Karik analyzes user request and engineers a detailed task prompt for the agent
    const orchestratedPrompt = routerService.buildOrchestratedPrompt(prompt, delegatedAgent, enrichedContext);

    const requestOptions = {
      ...options,
      model: targetModel,
      agent: delegatedAgent
    };

    // 3. Add to conversation history
    conversationService.addMessage('user', prompt, targetProvider);

    // 4. Dispatch to selected AI provider (with auto fallback to Gemini if mock or failed)
    let chatResult = await providerInstance.chat(orchestratedPrompt, requestOptions);
    let reply = typeof chatResult === 'object' && chatResult !== null ? (chatResult.text || '') : chatResult;

    if ((!reply || reply.includes('Mock Response')) && targetProvider !== 'gemini') {
      console.warn(`⚠️ [Router]: Provider ${targetProvider} returned mock/empty response. Falling back to Gemini...`);
      chatResult = await geminiService.chat(prompt, requestOptions);
      reply = typeof chatResult === 'object' && chatResult !== null ? (chatResult.text || '') : chatResult;
    }

    const rawUsage = typeof chatResult === 'object' && chatResult !== null ? chatResult.usage : null;
    const audioData = typeof chatResult === 'object' && chatResult !== null ? chatResult.audioData : null;
    const imageData = typeof chatResult === 'object' && chatResult !== null ? chatResult.imageData : null;
    const mimeType = typeof chatResult === 'object' && chatResult !== null ? chatResult.mimeType : null;
    const voice = typeof chatResult === 'object' && chatResult !== null ? chatResult.voice : null;

    // 5. Automatic Knowledge Pipeline (Asynchronous Background Execution & Continuous Self-Learning)
    (async () => {
      try {
        await knowledgePipelineService.learnFromConversation({
          prompt,
          reply,
          providerInstance
        });
      } catch (err) {
        console.warn('[KnowledgePipeline Background Error]:', err.message);
      }
    })();

    // 6. Accurate Token-Based Tracking & Reporting (No RPD limits)
    const tokenStats = await tokenService.trackTokens(targetProvider, prompt, reply, rawUsage);
    const estimatedCost = costService.calculateCost(
      targetProvider,
      tokenStats.inputTokens,
      tokenStats.outputTokens
    );

    // 7. Save assistant reply
    conversationService.addMessage('assistant', reply, targetProvider);

    return {
      reply,
      agent: delegatedAgent,
      model: targetModel,
      image: (typeof generatedImageResult !== 'undefined' && generatedImageResult && generatedImageResult.success) ? {
        url: generatedImageResult.url,
        model: generatedImageResult.model,
        mimeType: generatedImageResult.mimeType
      } : null,
      audioData,
      imageData,
      mimeType,
      voice,
      provider: targetProvider,
      tokens: {
        inputTokens: tokenStats.inputTokens,
        outputTokens: tokenStats.outputTokens,
        totalTokens: tokenStats.totalTokens,
        mode: 'token_based'
      },
      cost: estimatedCost,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };
  }
}

module.exports = new AIManagerService();
