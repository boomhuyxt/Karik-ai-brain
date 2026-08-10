const { parseYaml } = require('./yaml');

/**
 * Extracts frontmatter and body from Markdown document
 */
const parseMarkdown = (content = '') => {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const frontmatter = parseYaml(match[1]) || {};
  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
};

/**
 * Extracts Obsidian wiki links [[link]] or [[link|label]]
 */
const extractWikiLinks = (text = '') => {
  const regex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
  const links = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    links.push({
      target: match[1].trim(),
      alias: match[2] ? match[2].trim() : match[1].trim()
    });
  }
  return links;
};

module.exports = {
  parseMarkdown,
  extractWikiLinks
};
