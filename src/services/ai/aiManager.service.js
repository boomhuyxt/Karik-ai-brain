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
    const providerInstance = this.providers[targetProvider] || this.providers.gemini;
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

    // 2. Special handling for Shop Inventory Agent
    if (delegatedAgent.id === 'inventory') {
      const shopChatbotService = require('./shopChatbot.service');
      const shopKnowledgeRepo = require('../../repositories/shopKnowledge.repository');

      // Tự động bóc tách tên shop từ câu hỏi người dùng nếu có (vd: "shop huyQ7", "của shop huyQ7"...)
      let extractedShopId = null;
      const shopPattern = /(?:của\s+shop|shop|cửa\s+hàng)\s*[:\-]?\s*([a-zA-Z0-9_\-]+)/i;
      const shopMatch = prompt.match(shopPattern);
      const ignoreWords = ['nào', 'đó', 'n', '1', 'một', 'tôi', 'mình', 'nay', 'hôm', 'này', 'online', 'của', 'khác', 'bất', 'kỳ'];
      if (shopMatch && shopMatch[1] && !ignoreWords.includes(shopMatch[1].toLowerCase()) && shopMatch[1].length > 1) {
        extractedShopId = shopMatch[1].trim();
      }

      let shopId = extractedShopId || options.shop_id || options.user?.email;
      if (!shopId || shopId === 'default_shop') {
        try {
          const allFiles = await shopKnowledgeRepo.getAllFiles();
          if (allFiles && allFiles.length > 0 && allFiles[0].shop_id) {
            shopId = allFiles[0].shop_id;
          } else {
            shopId = 'default_shop';
          }
        } catch (e) {
          shopId = 'default_shop';
        }
      }

      const isReport = /(hôm (nay|đó|qua).*(bán được|doanh thu|danh thu|bán bao nhiêu|bao nhiêu sản phẩm|tiền bán)|(doanh thu|danh thu).*(hôm nay|hôm đó|hôm qua|ra sao|thế nào)|bán được gì|đã bán được gì|báo cáo.*(doanh thu|danh thu|bán hàng|kho|tổng quan)|tồn kho.*(còn lại|bao nhiêu|thế nào)|(xuất|tải|đưa ra|cho).*file.*(danh thu|doanh thu|excel|báo cáo|kho)|file (danh thu|doanh thu|excel)|thống kê.*(bán hàng|kho|doanh thu|danh thu)|tổng quan kho)/i.test(prompt);
      const isDirectQuestionOrOrder = /(mua|lấy|chốt|đặt|order|cho|giao|ship|giá|bao nhiêu|còn hàng|hết hàng|nhớt|bugi|lốp|phụ tùng|bảng tính|tồn kho|sản phẩm|bưu cục|vận đơn)/i.test(prompt);
      const hasContactInfo = /(?:\+84|84|0)[\s.-]*(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5|8|9]|9[0-4|6-9])(?:[\s.-]*\d){7}/.test(prompt) || /(họ tên|địa chỉ|sđt|số điện thoại|người nhận)/i.test(prompt);

      if (isReport || isDirectQuestionOrOrder || hasContactInfo) {
        try {
          const shopRes = await shopChatbotService.answerCustomerQuestion({
            shop_id: shopId,
            question: prompt,
            session_id: options.session_id || shopId
          });

          if (shopRes && shopRes.reply) {
            const reply = shopRes.reply;
            conversationService.addMessage('assistant', reply, 'gemini');
            const tokenStats = await tokenService.trackTokens('gemini', prompt, reply, null);

            return {
              reply,
              agent: delegatedAgent,
              model: targetModel,
              provider: 'gemini',
              excel_url: shopRes.excel_url || null,
              tokens: {
                inputTokens: tokenStats.inputTokens,
                outputTokens: tokenStats.outputTokens,
                totalTokens: tokenStats.totalTokens,
                mode: 'token_based'
              },
              cost: costService.calculateCost('gemini', tokenStats.inputTokens, tokenStats.outputTokens),
              timestamp: new Date().toLocaleTimeString('vi-VN')
            };
          }
        } catch (shopErr) {
          console.warn('[AIManagerService] Shop chatbot handling error:', shopErr.message);
        }
      }

      // Enrich context with shop files for general LLM questions
      try {
        const shopFiles = await shopKnowledgeRepo.getFilesByShop(shopId);
        if (shopFiles && shopFiles.length > 0) {
          const topChunks = shopFiles.map(f => f.semantic_chunks || '').join('\n---\n');
          enrichedContext = (enrichedContext ? enrichedContext + '\n\n' : '') + `\n\n[DỮ LIỆU KHO HÀNG THỰC TẾ TRONG HỆ THỐNG]:\n${topChunks}`;
        }
      } catch (ctxErr) {
        console.warn('[AIManagerService] Context enrichment error:', ctxErr.message);
      }
    }

    // 3. AI Karik analyzes user request and engineers a detailed task prompt for the agent
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
