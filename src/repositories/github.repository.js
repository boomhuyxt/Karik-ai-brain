const fs = require('fs');
const path = require('path');
const env = require('../config/env');

class GithubRepository {
  constructor() {
    this.memoryFiles = new Map();
    this.treeCache = null;
    this.treeCacheTime = 0;
    this.TREE_CACHE_TTL = 30 * 1000; // 30 seconds cache to save rate limits
  }

  getLocalVaultPath() {
    const candidatePaths = [
      process.env.OBSIDIAN_VAULT_PATH,
      env.obsidianVaultPath,
      'C:/Users/boomh/OneDrive/Documents/Jarvis Ai',
      'C:\\Users\\boomh\\OneDrive\\Documents\\Jarvis Ai',
      'C:/Users/boomh/OneDrive/Documents/Obsidian Vault',
      'C:\\Users\\boomh\\OneDrive\\Documents\\Obsidian Vault'
    ].filter(Boolean);

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
          return p;
        }
      } catch (e) {}
    }
    return null;
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

  async getTree(forceRefresh = false) {
    const owner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
    const repo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';

    if (!forceRefresh && this.treeCache && (Date.now() - this.treeCacheTime < this.TREE_CACHE_TTL)) {
      return this.treeCache;
    }

    // Try GitHub API first if token is available
    if (env.github.token) {
      try {
        let branch = 'main';
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(6000)
        });
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          branch = repoData.default_branch || 'main';
        } else if (repoRes.status === 403) {
          console.warn(`[GithubRepo] 403 Rate limit exceeded or access denied for ${owner}/${repo}`);
        } else if (repoRes.status === 401) {
          console.warn(`[GithubRepo] 401 Bad credentials for token in .env`);
        }

        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(6000)
        });

        if (treeRes.ok) {
          const treeData = await treeRes.json();
          if (Array.isArray(treeData.tree) && treeData.tree.length > 0) {
            this.treeCache = treeData.tree;
            this.treeCacheTime = Date.now();
            return this.treeCache;
          }
        }
      } catch (err) {
        console.warn('[GithubRepo] getTree remote error:', err.message);
      }
    }

    // Local Obsidian Vault Scanner Fallback
    const localVault = this.getLocalVaultPath();
    if (localVault) {
      try {
        const localTree = [];
        const walk = (dir) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            if (item.startsWith('.git') || item.startsWith('.obsidian') || item === 'node_modules' || item === '.trash') continue;
            const full = path.join(dir, item);
            const stat = fs.statSync(full);
            if (stat && stat.isDirectory()) {
              walk(full);
            } else if (item.endsWith('.md')) {
              const rel = path.relative(localVault, full).split(path.sep).join('/');
              localTree.push({
                path: rel,
                type: 'blob',
                sha: `local_${stat.mtimeMs}`,
                size: stat.size
              });
            }
          }
        };
        walk(localVault);
        if (localTree.length > 0) {
          this.treeCache = localTree;
          this.treeCacheTime = Date.now();
          return localTree;
        }
      } catch (e) {
        console.warn('[GithubRepo] Local vault scan notice:', e.message);
      }
    }

    // Memory fallback if network & local fail
    return Array.from(this.memoryFiles.values()).map(f => ({
      path: f.path,
      type: 'blob',
      sha: f.sha,
      size: Buffer.byteLength(f.content || '')
    }));
  }

  async getFile(filePath) {
    const owner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
    const repo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';

    if (this.memoryFiles.has(filePath)) {
      return this.memoryFiles.get(filePath);
    }

    // 1. Try local vault first if it exists
    const localVault = this.getLocalVaultPath();
    if (localVault) {
      try {
        const localFull = path.join(localVault, ...filePath.split('/'));
        if (fs.existsSync(localFull) && fs.statSync(localFull).isFile()) {
          const content = fs.readFileSync(localFull, 'utf8');
          const fileObj = { path: filePath, content, sha: `local_${Date.now()}` };
          this.memoryFiles.set(filePath, fileObj);
          return fileObj;
        }
      } catch (err) {
        console.warn(`[GithubRepo] Local getFile notice:`, err.message);
      }
    }

    // 2. Try GitHub REST API
    if (env.github.token) {
      const safePath = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const data = await res.json();
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          const fileObj = { path: filePath, content, sha: data.sha };
          this.memoryFiles.set(filePath, fileObj);
          return fileObj;
        } else if (res.status === 404) {
          return { path: filePath, content: `# ${filePath}\n\nFile mới tạo.`, sha: null };
        }
      } catch (err) {
        console.warn(`[GithubRepo] getFile error for ${filePath}:`, err.message);
      }
    }

    return { path: filePath, content: `# ${filePath}\n\nFile mới hoặc chưa tồn tại trên repository (${owner}/${repo}).`, sha: null };
  }

  async updateFile(filePath, content, message = 'Update note via AI Brain OS', sha) {
    const owner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
    const repo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';
    const encoded = Buffer.from(content).toString('base64');

    let targetSha = sha;
    if (!targetSha) {
      const existing = await this.getFile(filePath);
      if (existing && existing.sha) {
        targetSha = existing.sha;
      }
    }

    let newSha = targetSha || `sha_${Date.now()}`;

    // 1. Write to local Obsidian vault if available
    const localVault = this.getLocalVaultPath();
    if (localVault) {
      try {
        const localFull = path.join(localVault, ...filePath.split('/'));
        const dir = path.dirname(localFull);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(localFull, content, 'utf8');
      } catch (err) {
        console.warn('[GithubRepo] Local save notice:', err.message);
      }
    }

    // 2. Sync to GitHub repository if token is present
    if (env.github.token) {
      const safePath = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
      try {
        const body = {
          message,
          content: encoded
        };
        if (targetSha && !String(targetSha).startsWith('sha_') && !String(targetSha).startsWith('mock_') && !String(targetSha).startsWith('local_')) {
          body.sha = targetSha;
        }

        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`, {
          method: 'PUT',
          headers: {
            ...this.getHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(6000)
        });

        if (res.ok) {
          const data = await res.json();
          newSha = data.content?.sha || newSha;
        } else {
          const errText = await res.text();
          console.warn(`[GithubRepo] updateFile status ${res.status}:`, errText);
        }
      } catch (err) {
        console.warn(`[GithubRepo] updateFile remote error:`, err.message);
      }
    }

    const fileObj = { path: filePath, content, sha: newSha, updatedAt: new Date().toISOString() };
    this.memoryFiles.set(filePath, fileObj);
    this.treeCache = null; // Invalidate cache
    return fileObj;
  }
}

module.exports = new GithubRepository();
