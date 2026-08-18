const fs = require('fs');
const path = require('path');
const githubRepository = require('../../repositories/github.repository');
const env = require('../../config/env');

class GraphService {
  findLocalVaultPath() {
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

  scanLocalVault(vaultDir) {
    const results = [];
    if (!vaultDir || !fs.existsSync(vaultDir)) return results;

    const walk = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item.startsWith('.git') || item.startsWith('.obsidian') || item === 'node_modules' || item === '.trash') continue;
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            walk(fullPath);
          } else if (item.endsWith('.md')) {
            const relPath = path.relative(vaultDir, fullPath).split(path.sep).join('/');
            const content = fs.readFileSync(fullPath, 'utf8');
            results.push({
              path: relPath,
              content,
              size: stat.size,
              sha: `local_${stat.mtimeMs}`
            });
          }
        }
      } catch (err) {
        console.warn('[GraphService] Scan error:', err.message);
      }
    };

    walk(vaultDir);
    return results;
  }

  async getGraphData() {
    try {
      let mdFiles = [];
      let vaultSource = 'Local Obsidian Vault';

      // 1. Try local Obsidian Vault first (instant, 0 rate limit, contains all 180+ real notes)
      const localPath = this.findLocalVaultPath();
      if (localPath) {
        mdFiles = this.scanLocalVault(localPath);
        vaultSource = path.basename(localPath);
      }

      // 2. If local is empty, try GitHub API
      if (mdFiles.length === 0) {
        const tree = await githubRepository.getTree();
        const gitMdFiles = (tree || []).filter(item => item.path && item.path.endsWith('.md'));

        if (gitMdFiles.length > 0) {
          vaultSource = `${process.env.GITHUB_OWNER || env.github.owner}/${process.env.GITHUB_REPO || env.github.repo}`;
          const CHUNK_SIZE = 8;
          for (let i = 0; i < gitMdFiles.length; i += CHUNK_SIZE) {
            const chunk = gitMdFiles.slice(i, i + CHUNK_SIZE);
            const chunkRes = await Promise.all(
              chunk.map(async (file) => {
                const fileData = await githubRepository.getFile(file.path);
                return { path: file.path, content: fileData.content || '', size: file.size || 0, sha: file.sha };
              })
            );
            mdFiles.push(...chunkRes);
          }
        }
      }

      if (mdFiles.length === 0) {
        return this.getDefaultGraph();
      }

      const nodesMap = new Map();
      const lookupMap = new Map();
      const connections = [];

      const folderColorPalette = {
        'docker': '#0db7ed',
        'linux': '#f59e0b',
        'git': '#f43f5e',
        'sql': '#3b82f6',
        'manager': '#ff3366',
        'management': '#ff3366',
        'wiki': '#a78bfa',
        'daily': '#10b981',
        'raw': '#fbbf24',
        'projects': '#06b6d4',
        'system': '#ec4899',
        'clippings': '#8b5cf6',
        'kubernetes': '#326ce5'
      };

      const fallbackColors = ['#a78bfa', '#38bdf8', '#f43f5e', '#fb7185', '#c084fc', '#4ade80', '#fb923c', '#e879f9'];
      let fallbackIndex = 0;
      const folderColorsMap = new Map();
      const categoriesMap = new Map();

      // 1. Build Nodes
      for (const file of mdFiles) {
        const p = file.path.split(path.sep).join('/');
        const parts = p.split('/');
        const filename = parts.pop().replace(/\.md$/, '');
        
        let folder = 'Root';
        if (parts.length === 1) {
          folder = parts[0];
        } else if (parts.length > 1) {
          // If wiki/Docker -> folder is Docker
          folder = parts[parts.length - 1];
        }

        const folderLower = folder.toLowerCase();
        let color;
        if (folderColorPalette[folderLower]) {
          color = folderColorPalette[folderLower];
        } else if (folderColorsMap.has(folderLower)) {
          color = folderColorsMap.get(folderLower);
        } else {
          color = fallbackColors[fallbackIndex % fallbackColors.length];
          fallbackIndex++;
          folderColorsMap.set(folderLower, color);
        }

        categoriesMap.set(folder, {
          name: folder,
          folder: folder,
          color: color
        });

        const nodeObj = {
          id: p,
          name: filename,
          path: p,
          folder: folder,
          type: folderLower,
          color: color,
          shadow: color,
          sha: file.sha || '',
          size: file.size || 0,
          degree: 0
        };

        nodesMap.set(p, nodeObj);

        // Populate lookup maps for flexible WikiLink resolution
        lookupMap.set(p.toLowerCase(), p);
        lookupMap.set(p.replace(/\.md$/, '').toLowerCase(), p);
        lookupMap.set(filename.toLowerCase(), p);
        if (p.toLowerCase().startsWith('wiki/')) {
          lookupMap.set(p.slice(5).toLowerCase(), p);
          lookupMap.set(p.slice(5).replace(/\.md$/, '').toLowerCase(), p);
        }
      }

      // 2. Parse Obsidian WikiLinks [[Target Note]]
      for (const file of mdFiles) {
        const sourcePath = file.path.split(path.sep).join('/');
        const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(file.content || '')) !== null) {
          const rawTarget = match[1].trim();
          const targetKey = rawTarget.toLowerCase().replace(/\.md$/, '');
          const targetName = rawTarget.split('/').pop().replace(/\.md$/, '').toLowerCase();

          const targetPath = lookupMap.get(targetKey) || lookupMap.get(rawTarget.toLowerCase()) || lookupMap.get(targetName);

          if (targetPath && targetPath !== sourcePath && nodesMap.has(targetPath)) {
            connections.push({
              source: sourcePath,
              target: targetPath,
              type: 'wikilink'
            });
          }
        }
      }

      // Deduplicate connections
      const uniqueConnections = [];
      const connSet = new Set();
      for (const c of connections) {
        const key = [c.source, c.target].sort().join(':::');
        if (!connSet.has(key)) {
          connSet.add(key);
          uniqueConnections.push(c);

          // Increment degrees
          const sNode = nodesMap.get(c.source);
          const tNode = nodesMap.get(c.target);
          if (sNode) sNode.degree = (sNode.degree || 0) + 1;
          if (tNode) tNode.degree = (tNode.degree || 0) + 1;
        }
      }

      // 3. If very few links exist, connect by folder cluster
      const nodesList = Array.from(nodesMap.values());
      if (uniqueConnections.length === 0 && nodesList.length > 1) {
        for (let i = 1; i < nodesList.length; i++) {
          uniqueConnections.push({
            source: nodesList[0].id,
            target: nodesList[i].id,
            type: 'folder'
          });
        }
      }

      return {
        repo: vaultSource,
        totalFiles: nodesList.length,
        categories: Array.from(categoriesMap.values()),
        nodes: nodesList,
        connections: uniqueConnections
      };
    } catch (err) {
      console.warn('[GraphService] Failed to load graph data, fallback to default:', err.message);
      return this.getDefaultGraph();
    }
  }

  getDefaultGraph() {
    return {
      repo: `${env.github.owner}/${env.github.repo}`,
      totalFiles: 6,
      categories: [
        { name: 'Daily', folder: 'Daily', color: '#34d399' },
        { name: 'Wiki', folder: 'Wiki', color: '#d3bbff' },
        { name: 'Projects', folder: 'Projects', color: '#5de6ff' },
        { name: 'Manager', folder: 'Manager', color: '#ff3366' },
        { name: 'System', folder: 'System', color: '#ec4899' }
      ],
      nodes: [
        { id: 'Daily/2026-08-07.md', name: 'Daily 2026-08-07', path: 'Daily/2026-08-07.md', folder: 'Daily', color: '#34d399', shadow: '#34d399', type: 'daily', degree: 1 },
        { id: 'Wiki/AI Architecture.md', name: 'AI Architecture', path: 'Wiki/AI Architecture.md', folder: 'Wiki', color: '#d3bbff', shadow: '#d3bbff', type: 'wiki', degree: 3 },
        { id: 'Projects/Graph Dashboard.md', name: 'Graph Dashboard', path: 'Projects/Graph Dashboard.md', folder: 'Projects', color: '#5de6ff', shadow: '#5de6ff', type: 'project', degree: 2 },
        { id: 'Manager/AI Agent Manager.md', name: 'AI Agent Manager', path: 'Manager/AI Agent Manager.md', folder: 'Manager', color: '#ff3366', shadow: '#ff3366', type: 'manager', degree: 1 },
        { id: 'Wiki/Supabase RAG.md', name: 'Supabase RAG', path: 'Wiki/Supabase RAG.md', folder: 'Wiki', color: '#fbbf24', shadow: '#fbbf24', type: 'wiki', degree: 1 },
        { id: 'System/Config.md', name: 'System Config', path: 'System/Config.md', folder: 'System', color: '#ec4899', shadow: '#ec4899', type: 'system', degree: 1 }
      ],
      connections: [
        { source: 'Wiki/AI Architecture.md', target: 'Daily/2026-08-07.md' },
        { source: 'Projects/Graph Dashboard.md', target: 'Wiki/AI Architecture.md' },
        { source: 'Manager/AI Agent Manager.md', target: 'Projects/Graph Dashboard.md' },
        { source: 'Wiki/Supabase RAG.md', target: 'Wiki/AI Architecture.md' },
        { source: 'System/Config.md', target: 'Projects/Graph Dashboard.md' }
      ]
    };
  }
}

module.exports = new GraphService();
