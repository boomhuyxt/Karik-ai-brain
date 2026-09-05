/**
 * Authentic Obsidian Graph View Engine (D3.js Force Simulation)
 * Pixel-accurate Obsidian visual styling:
 * - Matte dark canvas (#181818)
 * - Muted grey/off-white celestial nodes with organic radius scaling
 * - Hairline subtle links (#333333 / rgba(255,255,255,0.18))
 * - Natural circular orbital boundary distribution
 * - Interactive Obsidian Settings Drawer (Filters, Groups, Display, Forces)
 */

let currentGraphData = null;
let simulation2D = null;
let zoomBehavior2D = null;
let svgSelection2D = null;
let containerGroup2D = null;
let hoverNode2D = null;
let currentZoomScale2D = 1;

// 1. Obsidian Filter States
let stateShowAllLabels = false;
let stateShowArrows = false;
let stateHideOrphans = false;
let stateShowTags = true;
let stateShowAttachments = false;
let stateExistingOnly = true;
let activeFilterFolder = null;
let currentSearchQuery = '';

// 2. Obsidian Display & Force Parameters
let textFadeThreshold = 1.35;
let nodeSizeMultiplier = 1.0;
let linkThicknessMultiplier = 1.0;
let centerForceStrength = 0.035;
let repelForceStrength = -75;
let linkForceStrength = 0.55;
let linkDistanceValue = 65;

// Default Constants for Reset
const DEFAULTS = {
    textFadeThreshold: 1.35,
    nodeSizeMultiplier: 1.0,
    linkThicknessMultiplier: 1.0,
    centerForceStrength: 0.035,
    repelForceStrength: -75,
    linkForceStrength: 0.55,
    linkDistanceValue: 65,
    showLabels: false,
    showArrows: false,
    hideOrphans: false,
    showTags: true,
    showAttachments: false,
    existingOnly: true
};

/* ==========================================================
   1. DATA FETCHING & INITIALIZATION
   ========================================================== */
async function fetchAndRenderGraph() {
    try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error('Failed to load graph data');
        currentGraphData = await res.json();

        if (currentGraphData) {
            const cleanRepoName = currentGraphData.repo || 'boomhuyxt/Obsidian-Karik-Ai';

            const repoBadges = document.querySelectorAll('#repoNameBadge, #graphRepoBadge');
            repoBadges.forEach(badge => {
                badge.textContent = cleanRepoName;
                badge.title = `Kho tri thức GitHub: ${cleanRepoName} (${currentGraphData.totalFiles || 0} ghi chú)`;
            });

            const totalCountBadges = document.querySelectorAll('#totalNotesCount');
            totalCountBadges.forEach(badge => {
                badge.textContent = `${currentGraphData.totalFiles || 0} Notes • ${currentGraphData.connections?.length || 0} Links`;
            });
        }
        renderGraph(currentGraphData);
    } catch (err) {
        console.error('[Obsidian Graph] Load Error:', err);
    }
}

window.fetchAndRenderGraph = fetchAndRenderGraph;

function renderFallbackNotice(data) {
    const container = document.getElementById('graphContainer');
    if (!container) return;

    let banner = document.getElementById('graphFallbackNotice');
    if (data && data.isFallback) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'graphFallbackNotice';
            banner.className = 'absolute bottom-6 left-6 z-30 glass-panel px-4 py-3 rounded-2xl border border-amber-500/50 bg-amber-950/80 text-amber-200 text-xs flex items-start gap-3 shadow-2xl backdrop-blur-xl max-w-lg pointer-events-auto transition-all';
            container.appendChild(banner);
        }
        const errorMsg = data.lastError?.message || 'Không thể kết nối tới GitHub repository.';
        banner.innerHTML = `
            <span class="material-symbols-outlined text-amber-400 text-xl flex-shrink-0 mt-0.5">warning</span>
            <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between">
                    <strong class="text-amber-300 text-xs uppercase tracking-wide">⚠️ Mất kết nối kho Obsidian GitHub</strong>
                    <span class="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded">Fallback 6 mẫu</span>
                </div>
                <p class="text-slate-200 text-[11px] leading-relaxed m-0">${errorMsg}</p>
                <div class="pt-1 text-[11px] text-amber-200/80 border-t border-amber-500/20 mt-1">
                    💡 <strong>Cách sửa:</strong> Hãy cập nhật token <code class="bg-black/50 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">GITHUB_PAT</code> mới trong file <code class="bg-black/50 text-amber-300 px-1.5 py-0.5 rounded font-mono">.env</code> để nạp lại toàn bộ các node Obsidian của bạn!
                </div>
            </div>
            <button onclick="document.getElementById('graphFallbackNotice')?.remove()" class="text-slate-400 hover:text-white p-0.5 rounded transition-colors" title="Đóng thông báo">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;
    } else if (banner) {
        banner.remove();
    }
}

function renderGraph(data) {
    if (!data) return;
    renderObsidianGroups(data);
    render2DGraph(data);
    renderFallbackNotice(data);
    bindGraphSearchSync();
}

/* ==========================================================
   2. SECTION: GROUPS (FOLDER COLOR GROUPS & LEGEND)
   ========================================================== */
function renderObsidianGroups(data) {
    const legendList = document.getElementById('legendList');
    if (!legendList) return;

    let categories = data.categories || [];
    if (categories.length === 0 && data.nodes) {
        const catMap = new Map();
        data.nodes.forEach(n => {
            if (n.folder) catMap.set(n.folder, { folder: n.folder, color: n.color });
        });
        categories = Array.from(catMap.values());
    }

    if (categories.length > 0) {
        const countMap = new Map();
        (data.nodes || []).forEach(n => {
            const f = n.folder || 'Root';
            countMap.set(f, (countMap.get(f) || 0) + 1);
        });

        legendList.innerHTML = categories.map(cat => {
            const count = countMap.get(cat.folder) || 0;
            const isSelected = activeFilterFolder === cat.folder;
            const dotColor = cat.color || '#a0a0a0';
            const itemBg = isSelected
                ? `bg-primary/20 border-primary/50 text-purple-900 dark:text-primary font-bold shadow-xs`
                : `bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border-slate-200/70 dark:border-white/5 text-slate-800 dark:text-white`;

            return `
            <div class="flex items-center justify-between gap-2.5 text-xs font-medium ${itemBg} px-3 py-2 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01]" data-folder="${encodeURIComponent(cat.folder)}" onclick="window.filterGraphByFolder(decodeURIComponent(this.dataset.folder))">
                <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                    <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style="background: ${dotColor}"></span>
                    <span class="font-semibold tracking-wide text-xs truncate">${cat.folder}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-lg flex-shrink-0 pointer-events-none">${count}</span>
            </div>
            `;
        }).join('');
    } else {
        legendList.innerHTML = '<div class="text-xs text-slate-500 dark:text-on-surface-variant italic py-2">Không có thư mục</div>';
    }
}

/* ==========================================================
   3. AUTHENTIC OBSIDIAN GRAPH RENDERING WITH D3
   ========================================================== */
function render2DGraph(data) {
    const container = document.getElementById('graphContainer');
    const svg = d3.select('#graphSvg');
    if (!container || svg.empty()) return;

    svg.selectAll('*').remove();

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 700;
    const cx = width / 2;
    const cy = height / 2;
    const outerOrbitRadius = Math.min(width, height) * 0.42;

    // Filter nodes based on active filters
    let rawNodes = (data.nodes || []).map(d => ({ ...d }));
    let rawLinks = (data.connections || []).map(d => ({ ...d }));

    // Compute connectivity degree
    const degreeMap = new Map();
    rawLinks.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
        degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    rawNodes.forEach(n => {
        n.degree = degreeMap.get(n.id) || n.degree || 0;
        
        // Obsidian celestial node radius formula:
        // Leaf/Orphan note: ~2.4px
        // Connected note: 3.0px - 4.5px
        // Cluster Hub: 5.5px - 8.5px
        let baseRadius = 2.4;
        if (n.degree > 0) {
            baseRadius = Math.max(2.8, Math.min(9.0, 2.5 + Math.sqrt(n.degree) * 1.8));
        }
        n.radius = baseRadius * nodeSizeMultiplier;

        // Authentic Obsidian node color: Clean light grey/off-white tone
        if (!n.color || n.color.startsWith('#6366f1') || n.color.startsWith('#a855f7')) {
            if (n.degree >= 5) {
                n.displayColor = '#e2e8f0'; // Hub: Off-white
            } else if (n.degree >= 2) {
                n.displayColor = '#cbd5e1'; // Connected: Light slate
            } else if (n.degree === 1) {
                n.displayColor = '#94a3b8'; // Single link: Muted grey
            } else {
                n.displayColor = '#888888'; // Orphan: Neutral grey
            }
        } else {
            n.displayColor = n.color;
        }
    });

    // Apply Filter: Hide Orphans
    if (stateHideOrphans) {
        rawNodes = rawNodes.filter(n => n.degree > 0);
    }

    const nodeById = new Map(rawNodes.map(n => [n.id, n]));
    const validLinks = [];

    rawLinks.forEach(link => {
        const a = typeof link.source === 'object' ? link.source : nodeById.get(link.source);
        const b = typeof link.target === 'object' ? link.target : nodeById.get(link.target);
        if (a && b) {
            a.neighbors = a.neighbors || [];
            b.neighbors = b.neighbors || [];
            a.links = a.links || [];
            b.links = b.links || [];
            a.neighbors.push(b);
            b.neighbors.push(a);
            a.links.push(link);
            b.links.push(link);
            validLinks.push(link);
        }
    });

    // Initial radial positions matching Obsidian celestial orbit
    const totalNodes = rawNodes.length;
    rawNodes.forEach((node, i) => {
        if (node.degree === 0) {
            // Orphan notes distributed around the outer orbital ring
            const angle = (i / (totalNodes || 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
            const dist = outerOrbitRadius * (0.88 + Math.random() * 0.22);
            node.x = cx + dist * Math.cos(angle);
            node.y = cy + dist * Math.sin(angle);
        } else if (node.degree >= 4) {
            // Major hubs clustered inside
            const r = 30 + Math.random() * 110;
            const theta = Math.random() * Math.PI * 2;
            node.x = cx + r * Math.cos(theta);
            node.y = cy + r * Math.sin(theta);
            node.isHub = true;
        } else {
            // General connected notes near clusters
            const r = 80 + Math.random() * 160;
            const theta = (i / (totalNodes || 1)) * Math.PI * 2;
            node.x = cx + r * Math.cos(theta);
            node.y = cy + r * Math.sin(theta);
        }
    });

    // Theme Colors Helper
    const isDarkMode = document.documentElement.classList.contains('dark');
    const defaultLinkStroke = isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.55)';
    const arrowColor = isDarkMode ? '#64748b' : '#94a3b8';
    const arrowActiveColor = isDarkMode ? '#ffffff' : '#0f172a';

    // SVG Defs for Arrowheads
    const defs = svg.append('defs');

    defs.append('marker')
        .attr('id', 'obsidian-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 16)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3.5L7,0L0,3.5')
        .attr('fill', arrowColor)
        .attr('opacity', 0.6);

    defs.append('marker')
        .attr('id', 'obsidian-arrow-active')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', arrowActiveColor);

    svgSelection2D = svg;
    containerGroup2D = svg.append('g');

    currentZoomScale2D = 1;
    zoomBehavior2D = d3.zoom()
        .scaleExtent([0.08, 7])
        .on('zoom', (event) => {
            currentZoomScale2D = event.transform.k;
            containerGroup2D.attr('transform', event.transform);
            updateLabelVisibility();
        });

    svg.call(zoomBehavior2D);

    // Authentic Obsidian D3 Force Physics Simulation
    simulation2D = d3.forceSimulation(rawNodes)
        .force('center', d3.forceCenter(cx, cy))
        .force('charge', d3.forceManyBody().strength(d => (repelForceStrength * 0.45) - (d.degree || 0) * 8))
        .force('collide', d3.forceCollide().radius(d => (d.radius || 3) + 3).strength(0.85))
        .force('link', d3.forceLink(validLinks).id(d => d.id).distance(l => {
            const sFolder = l.source.folder || 'Root';
            const tFolder = l.target.folder || 'Root';
            return (sFolder === tFolder) ? (linkDistanceValue * 0.45) : (linkDistanceValue * 0.95);
        }).strength(linkForceStrength))
        .force('radial', d3.forceRadial(d => d.degree === 0 ? outerOrbitRadius * 0.85 : (d.degree < 2 ? outerOrbitRadius * 0.55 : 0), cx, cy).strength(d => d.degree === 0 ? 0.18 : 0.02))
        .force('x', d3.forceX(cx).strength(centerForceStrength))
        .force('y', d3.forceY(cy).strength(centerForceStrength));

    // Links Layer (Hairline, clean Obsidian lines)
    const linkGroup = containerGroup2D.append('g').attr('class', 'links-layer');
    const linkLines = linkGroup
        .selectAll('line')
        .data(validLinks)
        .enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke', defaultLinkStroke)
        .attr('stroke-width', isDarkMode ? 0.8 * linkThicknessMultiplier : 1.0 * linkThicknessMultiplier)
        .attr('stroke-opacity', isDarkMode ? 0.35 : 0.65)
        .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);

    // Nodes Layer (Flat, solid, clean dots)
    const nodeGroup = containerGroup2D.append('g').attr('class', 'nodes-layer');
    const nodeItems = nodeGroup
        .selectAll('.node-group')
        .data(rawNodes)
        .enter().append('g')
        .attr('class', 'node-group')
        .attr('data-id', d => d.id)
        .attr('data-folder', d => d.folder)
        .style('cursor', 'pointer')
        .call(d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation2D.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x; d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) simulation2D.alphaTarget(0);
                d.fx = null; d.fy = null;
            })
        )
        .on('click', (event, d) => {
            event.stopPropagation();
            if (typeof window.openNoteDrawer === 'function' && d.path) {
                window.openNoteDrawer(d.path);
            }
        })
        .on('mouseenter', (event, d) => highlightNode2D(d))
        .on('mouseleave', () => unhighlightNode2D());

    // Main Node Circle (No heavy halos, pristine clean Obsidian circles)
    nodeItems.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => d.radius || 2.5)
        .attr('fill', d => d.displayColor || '#a0a0a0')
        .attr('stroke', d => d.degree >= 4 ? 'rgba(255,255,255,0.4)' : 'none')
        .attr('stroke-width', d => d.degree >= 4 ? '0.75px' : '0px');

    // Title Labels (Obsidian Style - Subtle, crisp, understated)
    nodeItems.append('text')
        .attr('class', 'node-text')
        .attr('dx', d => (d.radius || 3) + 5)
        .attr('dy', 3.5)
        .attr('font-size', isDarkMode ? '10.5px' : '9px')
        .attr('font-weight', d => d.degree >= 3 ? '600' : '400')
        .attr('font-family', "'Inter', -apple-system, BlinkMacSystemFont, sans-serif")
        .attr('fill', isDarkMode ? '#e4e4e7' : '#1e293b')
        .style('pointer-events', 'none')
        .style('paint-order', 'stroke fill')
        .style('stroke', isDarkMode ? '#181818' : '#f8fafc')
        .style('stroke-width', isDarkMode ? '2.5px' : '2px')
        .style('stroke-linejoin', 'round')
        .text(d => d.name);

    updateLabelVisibility();

    // Simulation Tick
    simulation2D.on('tick', () => {
        linkLines
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodeItems.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function updateLabelVisibility() {
        const isZoomedInClose = currentZoomScale2D >= textFadeThreshold;
        nodeItems.selectAll('.node-text')
            .style('opacity', d => {
                if (hoverNode2D) {
                    const isHovered = (hoverNode2D === d || (d.neighbors && d.neighbors.includes(hoverNode2D)));
                    return isHovered ? 1 : 0.06;
                }
                if (stateShowAllLabels) return 0.95;
                return isZoomedInClose ? 0.95 : 0;
            });
    }

    function highlightNode2D(d) {
        hoverNode2D = d;
        const neighborSet = new Set(d.neighbors || []);
        neighborSet.add(d);
        const linkSet = new Set(d.links || []);
        const isDark = document.documentElement.classList.contains('dark');

        // Dim non-neighbors
        nodeItems.style('opacity', n => neighborSet.has(n) ? 1 : 0.08);

        // Highlight hovered node circle
        nodeItems.selectAll('.node-circle')
            .attr('fill', n => n === d ? (isDark ? '#ffffff' : '#0f172a') : (neighborSet.has(n) ? (isDark ? '#e2e8f0' : '#334155') : (n.displayColor || '#a0a0a0')))
            .attr('stroke', n => n === d ? (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)') : 'none')
            .attr('stroke-width', n => n === d ? '2px' : '0px')
            .attr('r', n => n === d ? (n.radius * 1.25 + 1) : n.radius);

        nodeItems.selectAll('.node-text')
            .style('opacity', n => neighborSet.has(n) ? 1 : 0)
            .style('fill', n => n === d ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#e4e4e7' : '#1e293b'))
            .style('font-weight', n => n === d ? '700' : '600');

        // Brighten connected links
        linkLines
            .style('stroke-opacity', l => linkSet.has(l) ? 0.85 : 0.02)
            .style('stroke-width', l => linkSet.has(l) ? (1.3 * linkThicknessMultiplier) : (0.6 * linkThicknessMultiplier))
            .attr('stroke', l => linkSet.has(l) ? (isDark ? '#cbd5e1' : '#334155') : (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.18)'))
            .attr('marker-end', l => linkSet.has(l) ? 'url(#obsidian-arrow-active)' : (stateShowArrows ? 'url(#obsidian-arrow)' : null));
    }

    function unhighlightNode2D() {
        hoverNode2D = null;
        const isDark = document.documentElement.classList.contains('dark');
        nodeItems.style('opacity', 1);

        nodeItems.selectAll('.node-circle')
            .attr('fill', d => d.displayColor || '#a0a0a0')
            .attr('stroke', d => d.degree >= 4 ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)') : 'none')
            .attr('stroke-width', d => d.degree >= 4 ? '0.75px' : '0px')
            .attr('r', d => d.radius || 2.5);

        nodeItems.selectAll('.node-text')
            .style('fill', isDark ? '#e4e4e7' : '#1e293b')
            .style('stroke', isDark ? '#181818' : '#f8fafc')
            .style('stroke-width', isDark ? '2.5px' : '2px')
            .style('font-size', isDark ? '10.5px' : '9px')
            .style('font-weight', d => d.degree >= 3 ? '600' : '400');

        linkLines
            .style('stroke-opacity', isDark ? 0.35 : 0.65)
            .style('stroke-width', isDark ? 0.8 * linkThicknessMultiplier : 1.0 * linkThicknessMultiplier)
            .attr('stroke', isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.55)')
            .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);

        updateLabelVisibility();
    }
}

/* ==========================================================
   4. OBSIDIAN SETTINGS PANEL CONTROLS & SEGMENTED TABS
   ========================================================== */
window.switchGraphTab = function (tabName) {
    const tabs = ['filters', 'groups', 'display', 'forces'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const content = document.getElementById(`tabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const isActive = (t === tabName);

        if (content) {
            content.classList.toggle('hidden', !isActive);
            content.style.display = isActive ? 'block' : 'none';
        }
        if (btn) {
            if (isActive) {
                btn.className = 'graph-tab-btn flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all bg-primary/20 text-purple-800 dark:text-primary border border-primary/30 shadow-xs';
            } else {
                btn.className = 'graph-tab-btn flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent';
            }
        }
    });

    if (tabName === 'groups' && currentGraphData) {
        renderObsidianGroups(currentGraphData);
    }
};

window.toggleAccordion = function (sectionId, iconId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(iconId);
    if (!section) return;

    const isHidden = section.classList.contains('hidden');
    if (isHidden) {
        section.classList.remove('hidden');
        if (icon) icon.textContent = 'expand_less';
    } else {
        section.classList.add('hidden');
        if (icon) icon.textContent = 'expand_more';
    }
};

window.toggleGraphSettings = function () {
    const panel = document.getElementById('obsidianGraphSettingsPanel');
    const btn = document.getElementById('btnToggleGraphSettings');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (btn) {
            btn.classList.add('glow-active', 'border-primary');
        }
    } else {
        panel.classList.add('hidden');
        if (btn) {
            btn.classList.remove('glow-active', 'border-primary');
        }
    }
};

/* ==========================================================
   5. OBSIDIAN INTERACTIVE TOGGLES & SLIDERS EVENT HANDLERS
   ========================================================== */
// Section 1: Filters
window.toggleGraphTags = function (checked) {
    stateShowTags = typeof checked === 'boolean' ? checked : !stateShowTags;
    applyCurrentFilters();
};

window.toggleGraphAttachments = function (checked) {
    stateShowAttachments = typeof checked === 'boolean' ? checked : !stateShowAttachments;
    applyCurrentFilters();
};

window.toggleGraphExisting = function (checked) {
    stateExistingOnly = typeof checked === 'boolean' ? checked : !stateExistingOnly;
    applyCurrentFilters();
};

window.toggleOrphanNodes = function (checked) {
    if (typeof checked === 'boolean') {
        stateHideOrphans = !checked;
    } else {
        stateHideOrphans = !stateHideOrphans;
    }

    const toggleOrphansInput = document.getElementById('toggleOrphansInput');
    if (toggleOrphansInput) toggleOrphansInput.checked = !stateHideOrphans;

    const btnToggleOrphans = document.getElementById('btnToggleOrphans');
    if (btnToggleOrphans) {
        btnToggleOrphans.classList.toggle('bg-emerald-500/25', stateHideOrphans);
        btnToggleOrphans.classList.toggle('text-white', stateHideOrphans);
        btnToggleOrphans.classList.toggle('border-emerald-400', stateHideOrphans);
    }

    if (currentGraphData) {
        render2DGraph(currentGraphData);
    }
};

window.filterGraphByFolder = function (folder) {
    if (activeFilterFolder === folder) {
        activeFilterFolder = null;
    } else {
        activeFilterFolder = folder;
    }
    if (!currentGraphData) return;

    renderObsidianGroups(currentGraphData);
    applyCurrentFilters();
};

// Section 3: Display
window.toggleGraphArrows = function (checked) {
    if (typeof checked === 'boolean') {
        stateShowArrows = checked;
    } else {
        stateShowArrows = !stateShowArrows;
    }

    const toggleArrowsInput = document.getElementById('toggleArrowsInput');
    if (toggleArrowsInput) toggleArrowsInput.checked = stateShowArrows;

    const btnToggleArrows = document.getElementById('btnToggleArrows');
    if (btnToggleArrows) {
        btnToggleArrows.classList.toggle('bg-purple-500/25', stateShowArrows);
        btnToggleArrows.classList.toggle('text-white', stateShowArrows);
        btnToggleArrows.classList.toggle('border-purple-400', stateShowArrows);
    }

    d3.selectAll('.graph-link')
        .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);
};

window.toggleGraphLabels = function (checked) {
    if (typeof checked === 'boolean') {
        stateShowAllLabels = checked;
    } else {
        stateShowAllLabels = !stateShowAllLabels;
    }

    const toggleLabelsInput = document.getElementById('toggleLabelsInput');
    if (toggleLabelsInput) toggleLabelsInput.checked = stateShowAllLabels;

    const btnToggleLabels = document.getElementById('btnToggleLabels');
    if (btnToggleLabels) {
        btnToggleLabels.classList.toggle('bg-primary/20', stateShowAllLabels);
        btnToggleLabels.classList.toggle('text-purple-800', stateShowAllLabels);
        btnToggleLabels.classList.toggle('dark:text-primary', stateShowAllLabels);
        btnToggleLabels.classList.toggle('border-primary/40', stateShowAllLabels);
        btnToggleLabels.classList.toggle('shadow-xs', stateShowAllLabels);
    }

    const isZoomedInClose = currentZoomScale2D >= textFadeThreshold;
    d3.selectAll('.node-text')
        .style('opacity', d => {
            if (stateShowAllLabels) return 0.95;
            return isZoomedInClose ? 0.95 : 0;
        });
};

window.updateTextFadeThreshold = function (val) {
    textFadeThreshold = parseFloat(val);
    const label = document.getElementById('valTextFade');
    if (label) label.textContent = `${textFadeThreshold.toFixed(2)}x`;

    const isZoomedInClose = currentZoomScale2D >= textFadeThreshold;
    d3.selectAll('.node-text')
        .style('opacity', d => {
            if (stateShowAllLabels) return 0.95;
            return isZoomedInClose ? 0.95 : 0;
        });
};

window.updateNodeSizeMultiplier = function (val) {
    nodeSizeMultiplier = parseFloat(val);
    const label = document.getElementById('valNodeSize');
    if (label) label.textContent = `${nodeSizeMultiplier.toFixed(1)}x`;

    d3.selectAll('.node-group').each(function (d) {
        let baseRadius = 2.4;
        if (d.degree > 0) {
            baseRadius = Math.max(2.8, Math.min(9.0, 2.5 + Math.sqrt(d.degree) * 1.8));
        }
        d.radius = baseRadius * nodeSizeMultiplier;
        d3.select(this).select('.node-circle').attr('r', d.radius);
        d3.select(this).select('.node-text').attr('dx', d.radius + 5);
    });

    if (simulation2D) {
        simulation2D.force('collide', d3.forceCollide().radius(d => (d.radius || 3) + 3).strength(0.85));
        simulation2D.alpha(0.2).restart();
    }
};

window.updateLinkThicknessMultiplier = function (val) {
    linkThicknessMultiplier = parseFloat(val);
    const label = document.getElementById('valLinkThickness');
    if (label) label.textContent = `${linkThicknessMultiplier.toFixed(1)}x`;

    d3.selectAll('.graph-link')
        .attr('stroke-width', 0.8 * linkThicknessMultiplier);
};

// Section 4: Forces
window.updateCenterForce = function (val) {
    centerForceStrength = parseFloat(val);
    const label = document.getElementById('valCenterForce');
    if (label) label.textContent = centerForceStrength.toFixed(3);

    if (simulation2D && svgSelection2D) {
        const container = document.getElementById('graphContainer');
        const cx = (container?.clientWidth || 1000) / 2;
        const cy = (container?.clientHeight || 700) / 2;
        simulation2D.force('x', d3.forceX(cx).strength(centerForceStrength));
        simulation2D.force('y', d3.forceY(cy).strength(centerForceStrength));
        simulation2D.alpha(0.3).restart();
    }
};

window.updateRepelForce = function (val) {
    repelForceStrength = parseFloat(val);
    const label = document.getElementById('valRepelForce');
    if (label) label.textContent = repelForceStrength;

    if (simulation2D) {
        simulation2D.force('charge', d3.forceManyBody().strength(d => (repelForceStrength * 0.45) - (d.degree || 0) * 8));
        simulation2D.alpha(0.3).restart();
    }
};

window.updateLinkForce = function (val) {
    linkForceStrength = parseFloat(val);
    const label = document.getElementById('valLinkForce');
    if (label) label.textContent = linkForceStrength.toFixed(2);

    if (simulation2D) {
        simulation2D.force('link').strength(linkForceStrength);
        simulation2D.alpha(0.3).restart();
    }
};

window.updateLinkDistance = function (val) {
    linkDistanceValue = parseFloat(val);
    const label = document.getElementById('valLinkDistance');
    if (label) label.textContent = `${linkDistanceValue}px`;

    if (simulation2D) {
        simulation2D.force('link').distance(l => {
            const sFolder = l.source.folder || 'Root';
            const tFolder = l.target.folder || 'Root';
            return (sFolder === tFolder) ? (linkDistanceValue * 0.45) : (linkDistanceValue * 0.95);
        });
        simulation2D.alpha(0.3).restart();
    }
};

window.resetGraphForces = function () {
    centerForceStrength = DEFAULTS.centerForceStrength;
    repelForceStrength = DEFAULTS.repelForceStrength;
    linkForceStrength = DEFAULTS.linkForceStrength;
    linkDistanceValue = DEFAULTS.linkDistanceValue;

    const sliderCenter = document.getElementById('sliderCenterForce');
    const sliderRepel = document.getElementById('sliderRepelForce');
    const sliderLinkForce = document.getElementById('sliderLinkForce');
    const sliderLinkDist = document.getElementById('sliderLinkDistance');

    if (sliderCenter) sliderCenter.value = centerForceStrength;
    if (sliderRepel) sliderRepel.value = repelForceStrength;
    if (sliderLinkForce) sliderLinkForce.value = linkForceStrength;
    if (sliderLinkDist) sliderLinkDist.value = linkDistanceValue;

    const valCenter = document.getElementById('valCenterForce');
    const valRepel = document.getElementById('valRepelForce');
    const valLinkForce = document.getElementById('valLinkForce');
    const valLinkDist = document.getElementById('valLinkDistance');

    if (valCenter) valCenter.textContent = centerForceStrength.toFixed(3);
    if (valRepel) valRepel.textContent = repelForceStrength;
    if (valLinkForce) valLinkForce.textContent = linkForceStrength.toFixed(2);
    if (valLinkDist) valLinkDist.textContent = `${linkDistanceValue}px`;

    if (simulation2D) {
        const container = document.getElementById('graphContainer');
        const cx = (container?.clientWidth || 1000) / 2;
        const cy = (container?.clientHeight || 700) / 2;
        const outerOrbitRadius = Math.min(container?.clientWidth || 1000, container?.clientHeight || 700) * 0.42;

        simulation2D.force('x', d3.forceX(cx).strength(centerForceStrength))
            .force('y', d3.forceY(cy).strength(centerForceStrength))
            .force('charge', d3.forceManyBody().strength(d => (repelForceStrength * 0.45) - (d.degree || 0) * 8))
            .force('radial', d3.forceRadial(d => d.degree === 0 ? outerOrbitRadius * 0.85 : (d.degree < 2 ? outerOrbitRadius * 0.55 : 0), cx, cy).strength(d => d.degree === 0 ? 0.18 : 0.02));

        const linkForce = simulation2D.force('link');
        if (linkForce) {
            linkForce.strength(linkForceStrength);
            linkForce.distance(l => {
                const sFolder = l.source?.folder || 'Root';
                const tFolder = l.target?.folder || 'Root';
                return (sFolder === tFolder) ? (linkDistanceValue * 0.45) : (linkDistanceValue * 0.95);
            });
        }

        simulation2D.alpha(0.4).restart();
    }
};

window.resetGraphSettingsToDefault = function () {
    window.resetGraphForces();

    textFadeThreshold = DEFAULTS.textFadeThreshold;
    nodeSizeMultiplier = DEFAULTS.nodeSizeMultiplier;
    linkThicknessMultiplier = DEFAULTS.linkThicknessMultiplier;
    stateShowAllLabels = DEFAULTS.showLabels;
    stateShowArrows = DEFAULTS.showArrows;
    stateHideOrphans = DEFAULTS.hideOrphans;
    activeFilterFolder = null;
    currentSearchQuery = '';

    window.updateTextFadeThreshold(textFadeThreshold);
    window.updateNodeSizeMultiplier(nodeSizeMultiplier);
    window.updateLinkThicknessMultiplier(linkThicknessMultiplier);
    window.toggleGraphLabels(stateShowAllLabels);
    window.toggleGraphArrows(stateShowArrows);
    window.toggleOrphanNodes(!stateHideOrphans);
    window.clearGraphSearch();

    const sliderTextFade = document.getElementById('sliderTextFade');
    const sliderNodeSize = document.getElementById('sliderNodeSize');
    const sliderLinkThickness = document.getElementById('sliderLinkThickness');

    if (sliderTextFade) sliderTextFade.value = textFadeThreshold;
    if (sliderNodeSize) sliderNodeSize.value = nodeSizeMultiplier;
    if (sliderLinkThickness) sliderLinkThickness.value = linkThicknessMultiplier;

    if (currentGraphData) renderGraph(currentGraphData);
};

/* ==========================================================
   6. SEARCH & FILTERING LOGIC
   ========================================================== */
function bindGraphSearchSync() {
    const searchInputs = [
        document.getElementById('graphSearchInput'),
        document.getElementById('filterSearchInput'),
        document.getElementById('graphSearchInputMobile')
    ].filter(Boolean);

    const btnClear = document.getElementById('btnClearFilterSearch');

    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            searchInputs.forEach(other => {
                if (other !== input) other.value = e.target.value;
            });
            if (btnClear) {
                btnClear.classList.toggle('hidden', !currentSearchQuery);
            }
            applyCurrentFilters();
        });
    });
}

window.clearGraphSearch = function () {
    currentSearchQuery = '';
    const searchInputs = [
        document.getElementById('graphSearchInput'),
        document.getElementById('filterSearchInput'),
        document.getElementById('graphSearchInputMobile')
    ].filter(Boolean);

    searchInputs.forEach(input => input.value = '');
    const btnClear = document.getElementById('btnClearFilterSearch');
    if (btnClear) btnClear.classList.add('hidden');

    applyCurrentFilters();
};

function applyCurrentFilters() {
    const nodeItems = d3.selectAll('.node-group');
    const linkLines = d3.selectAll('.graph-link');
    if (nodeItems.empty()) return;

    nodeItems.style('opacity', function (d) {
        let matchSearch = true;
        let matchFolder = true;

        if (currentSearchQuery) {
            matchSearch = (d.name || '').toLowerCase().includes(currentSearchQuery) ||
                (d.path || '').toLowerCase().includes(currentSearchQuery) ||
                (d.folder || '').toLowerCase().includes(currentSearchQuery);
        }

        if (activeFilterFolder) {
            matchFolder = (d.folder === activeFilterFolder);
        }

        return (matchSearch && matchFolder) ? 1 : 0.08;
    });

    nodeItems.selectAll('.node-circle')
        .attr('stroke', function (d) {
            if (currentSearchQuery && (d.name || '').toLowerCase().includes(currentSearchQuery)) {
                return '#ffffff';
            }
            return d.degree >= 4 ? 'rgba(255,255,255,0.4)' : 'none';
        })
        .attr('stroke-width', function (d) {
            if (currentSearchQuery && (d.name || '').toLowerCase().includes(currentSearchQuery)) {
                return '2px';
            }
            return d.degree >= 4 ? '0.75px' : '0px';
        });

    linkLines.style('stroke-opacity', l => {
        if (activeFilterFolder) {
            const sFolder = l.source.folder || 'Root';
            const tFolder = l.target.folder || 'Root';
            return (sFolder === activeFilterFolder || tFolder === activeFilterFolder) ? 0.85 : 0.02;
        }
        return 0.35;
    });
}

/* ==========================================================
   7. ZOOM & RECENTER ACTIONS
   ========================================================== */
window.recenterGraphView = function () {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(750).call(
            zoomBehavior2D.transform,
            d3.zoomIdentity
        );
    }
};

window.zoomInGraph = function () {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(300).call(zoomBehavior2D.scaleBy, 1.35);
    }
};

window.zoomOutGraph = function () {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(300).call(zoomBehavior2D.scaleBy, 0.74);
    }
};

window.getCurrentGraphData = function () {
    return currentGraphData;
};

// Re-render or update graph styling seamlessly on theme change
window.addEventListener('themechange', () => {
    if (currentGraphData) {
        renderGraph(currentGraphData);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderGraph();
});

// Delegate segmented tab clicks reliably
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.graph-tab-btn');
    if (!tabBtn) return;
    if (tabBtn.id === 'tabBtnFilters') window.switchGraphTab('filters');
    else if (tabBtn.id === 'tabBtnGroups') window.switchGraphTab('groups');
    else if (tabBtn.id === 'tabBtnDisplay') window.switchGraphTab('display');
    else if (tabBtn.id === 'tabBtnForces') window.switchGraphTab('forces');
});
