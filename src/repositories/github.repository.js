const env = require('../config/env');

class GithubRepository {
  constructor() {
    this.memoryFiles = new Map();
  }

  getHeaders() {
    const headers = {
      'User-Agent': 'Jarvis-AI-Brain',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (env.github.token) {
      headers['Authorization'] = `Bearer ${env.github.token}`;
    }
    return headers;
  }

  async getTree() {
    const owner = env.github.owner || 'boomhuyxt';
    const repo = env.github.repo || 'Obsidian-Karik-Ai';

    try {
      // 1. Get default branch
      let branch = 'main';
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: this.getHeaders()
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        branch = repoData.default_branch || 'main';
      }

      // 2. Fetch full tree
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: this.getHeaders()
      });

      if (treeRes.ok) {
        const treeData = await treeRes.json();
        return treeData.tree || [];
      } else {
        console.warn(`[GithubRepo] Tree fetch status ${treeRes.status} for ${owner}/${repo}`);
      }
    } catch (err) {
      console.warn('[GithubRepo] getTree error:', err.message);
    }

    // Memory fallback if network fails
    return Array.from(this.memoryFiles.values()).map(f => ({
      path: f.path,
      type: 'blob',
      sha: f.sha,
      size: Buffer.byteLength(f.content || '')
    }));
  }

  async getFile(path) {
    const owner = env.github.owner || 'boomhuyxt';
    const repo = env.github.repo || 'Obsidian-Karik-Ai';

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
        headers: this.getHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const fileObj = { path, content, sha: data.sha };
        this.memoryFiles.set(path, fileObj);
        return fileObj;
      }
    } catch (err) {
      console.warn(`[GithubRepo] getFile error for ${path}:`, err.message);
    }

    if (this.memoryFiles.has(path)) {
      return this.memoryFiles.get(path);
    }

    return { path, content: `# ${path}\n\nFile mới hoặc chưa tồn tại trên GitHub repository (${owner}/${repo}).`, sha: null };
  }

  async updateFile(path, content, message = 'Update note via AI Brain OS', sha) {
    const owner = env.github.owner || 'boomhuyxt';
    const repo = env.github.repo || 'Obsidian-Karik-Ai';
    const encoded = Buffer.from(content).toString('base64');

    let targetSha = sha;
    if (!targetSha) {
      const existing = await this.getFile(path);
      if (existing && existing.sha) {
        targetSha = existing.sha;
      }
    }

    let newSha = targetSha || `sha_${Date.now()}`;

    try {
      const body = {
        message,
        content: encoded
      };
      if (targetSha) body.sha = targetSha;

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        newSha = data.content?.sha || newSha;
      } else {
        const errText = await res.text();
        console.warn(`[GithubRepo] updateFile status ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn(`[GithubRepo] updateFile error:`, err.message);
    }

    const fileObj = { path, content, sha: newSha, updatedAt: new Date().toISOString() };
    this.memoryFiles.set(path, fileObj);
    return fileObj;
  }
}

module.exports = new GithubRepository();
