const fs = require('fs');
const path = require('path');
const githubRepository = require('../../repositories/github.repository');
const env = require('../../config/env');

class GraphService {
  constructor() {
    this.graphCache = null;
    this.graphCacheTime = 0;
    this.GRAPH_CACHE_TTL = 30 * 1000; // 30 seconds memory cache
  }

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
          const items = fs.readdirSync(p);
          // Only use local vault if it has meaningful notes (> 5 items)
          if (items.length > 5) {
            return p;
          }
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

  async getGraphData(forceRefresh = false) {
    try {
      if (!forceRefresh && this.graphCache && (Date.now() - this.graphCacheTime < this.GRAPH_CACHE_TTL)) {
        return this.graphCache;
      }

      const owner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
      const repo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';
      const repoFullName = `${owner}/${repo}`;

      let mdFiles = [];
      let vaultSource = repoFullName;

      // 1. PRIMARY SOURCE: Fetch directly from GitHub API Tree
      try {
        const tree = await githubRepository.getTree(forceRefresh);
        const gitMdFiles = (tree || []).filter(item => 
          item.path && 
          item.path.endsWith('.md') && 
          !item.path.startsWith('.') &&
          !item.path.includes('/.') &&
          item.type !== 'tree'
        );

        if (gitMdFiles.length > 0) {
          vaultSource = repoFullName;
          mdFiles = gitMdFiles.map(file => ({
            path: file.path,
            size: file.size || 0,
            sha: file.sha || '',
            content: '' // Loaded on demand / cached
          }));
        }
      } catch (gitErr) {
        console.warn('[GraphService] GitHub tree fetch error:', gitErr.message);
      }

      // 2. SECONDARY SOURCE: Fallback to local Obsidian Vault if GitHub Tree is empty
      if (mdFiles.length === 0) {
        const localPath = this.findLocalVaultPath();
        if (localPath) {
          mdFiles = this.scanLocalVault(localPath);
          vaultSource = path.basename(localPath);
        }
      }

      // 3. Fallback to default sample graph if both sources are empty
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
        'kubernetes': '#326ce5',
        'root': '#818cf8',
        'journal': '#34d399'
      };

      const fallbackColors = [
        '#a78bfa', '#38bdf8', '#f43f5e', '#fb7185', '#c084fc', 
        '#4ade80', '#fb923c', '#e879f9', '#2dd4bf', '#facc15'
      ];
      let fallbackIndex = 0;
      const folderColorsMap = new Map();
      const categoriesMap = new Map();
      const folderNodesMap = new Map();

      // 1. Build Nodes
      for (const file of mdFiles) {
        const p = file.path.split(path.sep).join('/');
        const parts = p.split('/');
        const filename = parts.pop().replace(/\.md$/, '');
        
        let folder = 'Root';
        if (parts.length === 1) {
          folder = parts[0];
        } else if (parts.length > 1) {
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

        if (!categoriesMap.has(folder)) {
          categoriesMap.set(folder, {
            name: folder,
            folder: folder,
            color: color
          });
        }

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

        if (!folderNodesMap.has(folder)) {
          folderNodesMap.set(folder, []);
        }
        folderNodesMap.get(folder).push(nodeObj);

        // Populate lookup maps for flexible WikiLink resolution
        lookupMap.set(p.toLowerCase(), p);
        lookupMap.set(p.replace(/\.md$/, '').toLowerCase(), p);
        lookupMap.set(filename.toLowerCase(), p);
        if (p.toLowerCase().startsWith('wiki/')) {
          lookupMap.set(p.slice(5).toLowerCase(), p);
          lookupMap.set(p.slice(5).replace(/\.md$/, '').toLowerCase(), p);
        }
      }

      // 2. Check for cached file content WikiLinks
      for (const file of mdFiles) {
        const sourcePath = file.path.split(path.sep).join('/');
        const cachedFile = githubRepository.memoryFiles.get(sourcePath);
        const fileContent = (cachedFile && cachedFile.content) || file.content || '';

        if (fileContent) {
          const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
          let match;
          while ((match = wikiLinkRegex.exec(fileContent)) !== null) {
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
      }

      // 3. Build cluster connections within folders to form an authentic constellation graph
      for (const [folderName, fNodes] of folderNodesMap.entries()) {
        if (fNodes.length <= 1) continue;

        // Pick a cluster hub note (e.g. index/overview or first note)
        const hubIndex = fNodes.findIndex(n => 
          n.name.toLowerCase().includes('index') || 
          n.name.toLowerCase().includes('00') || 
          n.name.toLowerCase().includes('map of content') ||
          n.name.toLowerCase().includes('overview')
        );
        const hubNode = hubIndex >= 0 ? fNodes[hubIndex] : fNodes[0];

        for (let i = 0; i < fNodes.length; i++) {
          const current = fNodes[i];
          if (current.id !== hubNode.id) {
            connections.push({
              source: hubNode.id,
              target: current.id,
              type: 'folder'
            });
          }

          // Connect sequential notes in the same folder if small cluster
          if (i > 0 && fNodes.length < 15 && fNodes[i - 1].id !== hubNode.id) {
            connections.push({
              source: fNodes[i - 1].id,
              target: current.id,
              type: 'cluster'
            });
          }
        }
      }

      // 4. Connect major folder hubs to each other for cross-vault navigation
      const folderList = Array.from(folderNodesMap.keys());
      if (folderList.length > 1) {
        for (let i = 1; i < folderList.length; i++) {
          const prevHub = folderNodesMap.get(folderList[i - 1])[0];
          const currHub = folderNodesMap.get(folderList[i])[0];
          if (prevHub && currHub) {
            connections.push({
              source: prevHub.id,
              target: currHub.id,
              type: 'inter_hub'
            });
          }
        }
      }

      // Deduplicate connections and calculate degree
      const uniqueConnections = [];
      const connSet = new Set();
      for (const c of connections) {
        const key = [c.source, c.target].sort().join(':::');
        if (!connSet.has(key)) {
          connSet.add(key);
          uniqueConnections.push(c);

          const sNode = nodesMap.get(c.source);
          const tNode = nodesMap.get(c.target);
          if (sNode) sNode.degree = (sNode.degree || 0) + 1;
          if (tNode) tNode.degree = (tNode.degree || 0) + 1;
        }
      }

      const nodesList = Array.from(nodesMap.values());
      const result = {
        repo: vaultSource,
        totalFiles: nodesList.length,
        categories: Array.from(categoriesMap.values()),
        nodes: nodesList,
        connections: uniqueConnections
      };

      this.graphCache = result;
      this.graphCacheTime = Date.now();
      return result;
    } catch (err) {
      console.warn('[GraphService] Failed to load graph data, fallback to default:', err.message);
      return this.getDefaultGraph();
    }
  }

  getDefaultGraph() {
    const owner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
    const repo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';
    return {
      repo: `${owner}/${repo}`,
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
