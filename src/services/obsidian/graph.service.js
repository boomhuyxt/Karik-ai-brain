const githubRepository = require('../../repositories/github.repository');
const env = require('../../config/env');

class GraphService {
  async getGraphData() {
    try {
      const tree = await githubRepository.getTree();
      const mdFiles = (tree || []).filter(item => item.path && item.path.endsWith('.md'));

      if (mdFiles.length === 0) {
        return this.getDefaultGraph();
      }

      const nodesMap = new Map();
      const connections = [];

      const folderColorPalette = {
        'daily': '#34d399',
        'wiki': '#d3bbff',
        'projects': '#5de6ff',
        'project': '#5de6ff',
        'raw': '#fbbf24',
        'clippings': '#22d3ee',
        'ideas': '#f59e0b',
        'system': '#ec4899',
        'manager': '#ff3366',
        'managers': '#ff3366',
        'management': '#ff3366'
      };

      const fallbackColors = ['#a78bfa', '#38bdf8', '#f43f5e', '#fb7185', '#c084fc', '#4ade80'];
      let fallbackIndex = 0;

      const folderColorsMap = new Map();
      const categoriesMap = new Map();

      // 1. Create Nodes
      for (const file of mdFiles) {
        const path = file.path;
        const filename = path.split('/').pop().replace(/\.md$/, '');
        const folder = path.includes('/') ? path.split('/')[0] : 'Root';
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

        let type = folderLower;

        categoriesMap.set(folder, {
          name: folder,
          folder: folder,
          color: color
        });

        nodesMap.set(path, {
          id: path,
          name: filename,
          path: path,
          folder: folder,
          type: type,
          color: color,
          shadow: color,
          sha: file.sha || '',
          size: file.size || 0
        });

        // Also map title -> path for WikiLink matching
        nodesMap.set(filename.toLowerCase(), path);
        if (folder !== 'Root') {
          nodesMap.set(`${folder.toLowerCase()}/${filename.toLowerCase()}`, path);
        }
      }

      // 2. Parse Links & Connections (Parallel Fetching)
      const fileResults = await Promise.all(
        mdFiles.map(async (file) => {
          const fileData = await githubRepository.getFile(file.path);
          return { path: file.path, content: fileData.content || '' };
        })
      );

      for (const { path: filePath, content } of fileResults) {
        // Extract Obsidian WikiLinks: [[Target Note]] or [[Folder/Target Note]]
        const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
          const rawTarget = match[1].trim();
          const targetName = rawTarget.split('/').pop().replace(/\.md$/, '').toLowerCase();
          const targetKey = rawTarget.toLowerCase();

          const targetPath = nodesMap.get(targetKey) || nodesMap.get(targetName);
          if (targetPath && typeof targetPath === 'string' && targetPath !== filePath) {
            connections.push({
              source: filePath,
              target: targetPath,
              type: 'wikilink'
            });
          }
        }
      }

      // 3. Fallback connecting nodes if no explicit wiki links exist yet
      const nodesList = Array.from(nodesMap.values()).filter(n => typeof n === 'object');
      if (connections.length === 0 && nodesList.length > 1) {
        for (let i = 1; i < nodesList.length; i++) {
          connections.push({
            source: nodesList[0].id,
            target: nodesList[i].id,
            type: 'folder'
          });
        }
      }

      const currentOwner = process.env.GITHUB_OWNER || env.github.owner || 'boomhuyxt';
      const currentRepo = process.env.GITHUB_REPO || env.github.repo || 'Obsidian-Karik-Ai';

      return {
        repo: `${currentOwner}/${currentRepo}`,
        totalFiles: nodesList.length,
        categories: Array.from(categoriesMap.values()),
        nodes: nodesList,
        connections: connections
      };
    } catch (err) {
      console.warn('[GraphService] Failed to load GitHub repo graph, returning default graph:', err.message);
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
        { id: 'Daily/2026-08-07.md', name: 'Daily 2026-08-07', path: 'Daily/2026-08-07.md', folder: 'Daily', color: '#34d399', shadow: '#34d399', type: 'daily' },
        { id: 'Wiki/AI Architecture.md', name: 'AI Architecture', path: 'Wiki/AI Architecture.md', folder: 'Wiki', color: '#d3bbff', shadow: '#d3bbff', type: 'wiki' },
        { id: 'Projects/Graph Dashboard.md', name: 'Graph Dashboard', path: 'Projects/Graph Dashboard.md', folder: 'Projects', color: '#5de6ff', shadow: '#5de6ff', type: 'project' },
        { id: 'Manager/AI Agent Manager.md', name: 'AI Agent Manager', path: 'Manager/AI Agent Manager.md', folder: 'Manager', color: '#ff3366', shadow: '#ff3366', type: 'manager' },
        { id: 'Wiki/Supabase RAG.md', name: 'Supabase RAG', path: 'Wiki/Supabase RAG.md', folder: 'Wiki', color: '#fbbf24', shadow: '#fbbf24', type: 'wiki' },
        { id: 'System/Config.md', name: 'System Config', path: 'System/Config.md', folder: 'System', color: '#ec4899', shadow: '#ec4899', type: 'system' }
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

