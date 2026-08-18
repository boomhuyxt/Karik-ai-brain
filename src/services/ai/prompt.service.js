const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.resolve(__dirname, '../../prompts');

class PromptService {
  constructor() {
    this.promptCache = new Map();
  }

  /**
   * Reads and caches a markdown prompt template from the prompts directory
   * @param {string} filename - Name of prompt file (e.g. 'system.prompt.md' or 'system')
   * @returns {string} The prompt markdown content
   */
  readPromptMd(filename) {
    const normalizedName = filename.endsWith('.md')
      ? (filename.includes('.prompt.md') ? filename : `${filename.replace(/\.md$/, '')}.prompt.md`)
      : (filename.endsWith('.prompt') ? `${filename}.md` : `${filename}.prompt.md`);

    if (this.promptCache.has(normalizedName)) {
      return this.promptCache.get(normalizedName);
    }

    const fullPath = path.join(PROMPTS_DIR, normalizedName);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8').trim();
      this.promptCache.set(normalizedName, content);
      return content;
    }

    return '';
  }

  /**
   * Generic prompt renderer with variable substitution
   * @param {string} promptName - Prompt filename or prefix (e.g. 'coding', 'wiki')
   * @param {Record<string, string>} variables - Map of variables to replace {{key}}
   * @returns {string}
   */
  renderPrompt(promptName, variables = {}) {
    let template = this.readPromptMd(promptName);
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      template = template.replace(pattern, value !== undefined && value !== null ? String(value) : '');
    }
    return template;
  }

  /**
   * System Prompt (Global identity & persona)
   */
  get systemPrompt() {
    return this.readPromptMd('system.prompt.md');
  }

  getSystemPrompt() {
    return this.systemPrompt;
  }

  /**
   * Coding Prompt template renderer
   */
  getCodingPrompt(instruction = '', code = '') {
    return this.renderPrompt('coding.prompt.md', { instruction, code });
  }

  /**
   * Code Review Prompt template renderer
   */
  getReviewPrompt(code = '') {
    return this.renderPrompt('review.prompt.md', { code });
  }

  /**
   * Obsidian Wiki Distillation Prompt template renderer
   */
  getWikiPrompt(topic = '', context = '') {
    return this.renderPrompt('wiki.prompt.md', { topic, context });
  }

  /**
   * Document Summary Prompt template renderer
   */
  getSummaryPrompt(text = '') {
    return this.renderPrompt('summary.prompt.md', { text });
  }

  /**
   * List all available markdown prompt files
   */
  listPrompts() {
    if (!fs.existsSync(PROMPTS_DIR)) return [];
    return fs.readdirSync(PROMPTS_DIR).filter(file => file.endsWith('.md'));
  }

  /**
   * Clear in-memory cache
   */
  clearCache() {
    this.promptCache.clear();
  }
}

module.exports = new PromptService();
