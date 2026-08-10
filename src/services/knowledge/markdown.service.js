const githubRepository = require('../../repositories/github.repository');
const { parseMarkdown, extractWikiLinks } = require('../../utils/markdown');

class MarkdownService {
  async getMarkdownFile(filePath) {
    const rawData = await githubRepository.getFile(filePath);
    const parsed = parseMarkdown(rawData.content);
    const links = extractWikiLinks(rawData.content);

    return {
      path: filePath,
      sha: rawData.sha,
      metadata: parsed.frontmatter,
      body: parsed.body,
      links
    };
  }
}

module.exports = new MarkdownService();
