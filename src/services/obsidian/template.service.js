class TemplateService {
  applyTemplate(templateName, variables = {}) {
    let content = `# {{title}}\n\n- Created: {{date}}\n- Tags: #wiki #ai-brain\n\n## Overview\n{{overview}}\n`;
    for (const [key, val] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }
    return content;
  }
}

module.exports = new TemplateService();
