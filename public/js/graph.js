/**
 * AI Graph Simulation Module - Authentic Obsidian Constellation Graph
 * Displays Markdown Notes, [[WikiLinks]] Connections, Hubs, and Folders.
 */
let currentGraphData = null;
let simulation2D = null;
let zoomBehavior2D = null;
let svgSelection2D = null;
let containerGroup2D = null;
let hoverNode2D = null;
let currentZoomScale2D = 1;

// Obsidian View States
let stateShowAllLabels = false;
let stateShowArrows = false;
let stateHideOrphans = false;
let activeFilterFolder = null;

async function fetchAndRenderGraph() {
    try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error('Failed to load graph data');
        currentGraphData = await res.json();

        if (currentGraphData) {
            const repoBadge = document.getElementById('repoNameBadge');
            if (repoBadge) {
                repoBadge.textContent = currentGraphData.repo || 'Obsidian Vault';
                repoBadge.title = `Kho tri thức: ${currentGraphData.repo} (${currentGraphData.totalFiles || 0} ghi chú)`;
            }
            const totalCountBadge = document.getElementById('totalNotesCount');
            if (totalCountBadge) {
                totalCountBadge.textContent = `${currentGraphData.totalFiles || 0} Notes • ${currentGraphData.connections?.length || 0} Links`;
            }
        }
        renderGraph(currentGraphData);
    } catch (err) {
        console.error('Graph Load Error:', err);
    }
}

window.fetchAndRenderGraph = fetchAndRenderGraph;

function renderGraph(data) {
    if (!data) return;
    renderLegend(data);
    render2DGraph(data);
    bindGraphSearch();
}

function renderLegend(data) {
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
            const itemBg = isSelected
                ? `bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.3)] text-cyan-200`
                : `bg-white/5 hover:bg-white/15 border-white/15 shadow-sm text-white`;

            return `
            <div class="flex items-center justify-between gap-3 text-xs font-medium ${itemBg} px-3 py-1.5 rounded-lg border transition-all cursor-pointer group hover:scale-[1.02]" onclick="window.filterGraphByFolder('${cat.folder}')">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background: ${cat.color}; box-shadow: 0 0 8px ${cat.color}"></span>
                    <span class="font-bold tracking-wide text-xs truncate">${cat.folder}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-300 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded flex-shrink-0">${count}</span>
            </div>
            `;
        }).join('');
    } else {
        legendList.innerHTML = '<div class="text-xs text-on-surface-variant italic">Không có thư mục</div>';
    }
}

/* ==========================================================
   2. AUTHENTIC OBSIDIAN GRAPH RENDERING WITH D3
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

    // Filter nodes if orphan filtering is ON
    let rawNodes = (data.nodes || []).map(d => ({ ...d }));
    let rawLinks = (data.connections || []).map(d => ({ ...d }));

    // Degree computation
    const degreeMap = new Map();
    rawLinks.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
        degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    rawNodes.forEach(n => {
        n.degree = degreeMap.get(n.id) || n.degree || 0;
        // Obsidian-style celestial radius: scales smoothly with connectivity
        n.radius = Math.max(4.0, Math.min(16, 3.8 + Math.sqrt(n.degree) * 2.8));
    });

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

    // Initial radial positions by folder
    const folderMap = new Map();
    rawNodes.forEach(n => {
        const f = n.folder || 'Root';
        if (!folderMap.has(f)) folderMap.set(f, []);
        folderMap.get(f).push(n);
    });

    const folderNames = Array.from(folderMap.keys());
    const folderAngleMap = new Map();
    folderNames.forEach((folder, idx) => {
        const angle = (idx / (folderNames.length || 1)) * Math.PI * 2;
        folderAngleMap.set(folder, angle);
    });

    rawNodes.forEach((node, i) => {
        if (node.degree >= 3 || i < Math.max(6, rawNodes.length * 0.12)) {
            const r = 20 + Math.random() * 90;
            const theta = Math.random() * Math.PI * 2;
            node.x = cx + r * Math.cos(theta);
            node.y = cy + r * Math.sin(theta);
            node.isHub = true;
        } else {
            const folderAngle = folderAngleMap.get(node.folder || 'Root') || (i * 0.5);
            const clusterDist = 180 + (i % 4) * 60;
            const jitterAngle = (Math.random() - 0.5) * 0.45;
            const finalAngle = folderAngle + jitterAngle;

            node.x = cx + clusterDist * Math.cos(finalAngle);
            node.y = cy + clusterDist * Math.sin(finalAngle);
        }
    });

    // 1. SVG Defs for Arrowheads & Glow Filters
    const defs = svg.append('defs');

    // Arrowhead default
    defs.append('marker')
        .attr('id', 'obsidian-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L9,0L0,4')
        .attr('fill', '#94a3b8')
        .attr('opacity', 0.5);

    // Arrowhead active/highlighted
    defs.append('marker')
        .attr('id', 'obsidian-arrow-active')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', '#5de6ff');

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

    // 2. D3 Force Physics Simulation
    simulation2D = d3.forceSimulation(rawNodes)
        .force('center', d3.forceCenter(cx, cy))
        .force('charge', d3.forceManyBody().strength(d => -75 - (d.degree || 0) * 14))
        .force('collide', d3.forceCollide().radius(d => (d.radius || 5) + 7).strength(0.9))
        .force('link', d3.forceLink(validLinks).id(d => d.id).distance(l => {
            const sFolder = l.source.folder || 'Root';
            const tFolder = l.target.folder || 'Root';
            return (sFolder === tFolder) ? 60 : 135;
        }).strength(0.45))
        .force('x', d3.forceX(cx).strength(0.035))
        .force('y', d3.forceY(cy).strength(0.035));

    // 3. Links Layer
    const linkGroup = containerGroup2D.append('g').attr('class', 'links-layer');
    const linkLines = linkGroup
        .selectAll('line')
        .data(validLinks)
        .enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.0)
        .attr('stroke-opacity', 0.22)
        .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);

    // 4. Nodes Layer
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

    // Outer Halo Circle for Hub Nodes
    nodeItems.filter(d => d.degree >= 3 || d.isHub)
        .append('circle')
        .attr('class', 'node-halo')
        .attr('r', d => (d.radius || 6) + 4)
        .attr('fill', 'none')
        .attr('stroke', d => d.color || '#a78bfa')
        .attr('stroke-width', '1px')
        .attr('stroke-opacity', 0.35)
        .style('pointer-events', 'none');

    // Main Node Circle
    nodeItems.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => d.radius || 5)
        .attr('fill', d => d.color || '#a78bfa')
        .attr('stroke', d => d.degree >= 3 ? '#ffffff' : 'rgba(255,255,255,0.45)')
        .attr('stroke-width', d => d.degree >= 3 ? '1.8px' : '1px')
        .style('filter', d => `drop-shadow(0 0 6px ${d.color || '#a78bfa'})`);

    // Title Labels
    nodeItems.append('text')
        .attr('class', 'node-text')
        .attr('dx', d => (d.radius || 5) + 4)
        .attr('dy', 3.5)
        .attr('font-size', '10px')
        .attr('font-family', 'Inter, JetBrains Mono, sans-serif')
        .attr('fill', '#e2e8f0')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 0 8px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1)')
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
        const isZoomedInClose = currentZoomScale2D >= 1.35;
        nodeItems.selectAll('.node-text')
            .style('opacity', d => {
                if (hoverNode2D) {
                    const isHovered = (hoverNode2D === d || (d.neighbors && d.neighbors.includes(hoverNode2D)));
                    return isHovered ? 1 : 0.08;
                }
                if (stateShowAllLabels) return 0.95;
                if (d.degree >= 3 || d.isHub) return 0.95;
                return isZoomedInClose ? 0.9 : 0;
            });
    }

    function highlightNode2D(d) {
        hoverNode2D = d;
        const neighborSet = new Set(d.neighbors || []);
        neighborSet.add(d);
        const linkSet = new Set(d.links || []);

        // Dim non-neighbors
        nodeItems.style('opacity', n => neighborSet.has(n) ? 1 : 0.08);

        // Highlight hovered node circle & halo
        nodeItems.selectAll('.node-circle')
            .style('stroke', n => n === d ? '#ffffff' : (neighborSet.has(n) ? '#5de6ff' : 'rgba(255,255,255,0.45)'))
            .style('stroke-width', n => n === d ? '2.8px' : (neighborSet.has(n) ? '2px' : '1px'))
            .attr('r', n => n === d ? (n.radius * 1.35) : n.radius);

        nodeItems.selectAll('.node-text')
            .style('opacity', n => neighborSet.has(n) ? 1 : 0)
            .style('fill', n => n === d ? '#5de6ff' : (neighborSet.has(n) ? '#ffffff' : '#e2e8f0'))
            .style('font-weight', n => n === d ? 'bold' : (neighborSet.has(n) ? '600' : 'normal'))
            .style('font-size', n => n === d ? '12px' : '10px');

        // Brighten connected links
        linkLines
            .style('stroke-opacity', l => linkSet.has(l) ? 0.95 : 0.02)
            .style('stroke-width', l => linkSet.has(l) ? 2.2 : 0.8)
            .attr('stroke', l => linkSet.has(l) ? '#5de6ff' : '#64748b')
            .attr('marker-end', l => linkSet.has(l) ? 'url(#obsidian-arrow-active)' : (stateShowArrows ? 'url(#obsidian-arrow)' : null));
    }

    function unhighlightNode2D() {
        hoverNode2D = null;
        nodeItems.style('opacity', 1);

        nodeItems.selectAll('.node-circle')
            .style('stroke', n => n.degree >= 3 ? '#ffffff' : 'rgba(255,255,255,0.45)')
            .style('stroke-width', n => n.degree >= 3 ? '1.8px' : '1px')
            .attr('r', n => n.radius || 5);

        nodeItems.selectAll('.node-text')
            .style('fill', '#e2e8f0')
            .style('font-weight', 'normal')
            .style('font-size', '10px');

        linkLines
            .style('stroke-opacity', 0.22)
            .style('stroke-width', 1.0)
            .attr('stroke', '#64748b')
            .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);

        updateLabelVisibility();
    }
}

/* ==========================================================
   3. OBSIDIAN GRAPH CONTROLS & EVENT HANDLERS
   ========================================================== */
window.toggleGraphLabels = function () {
    stateShowAllLabels = !stateShowAllLabels;
    const btn = document.getElementById('btnToggleLabels');
    if (btn) {
        btn.classList.toggle('bg-cyan-500/20', stateShowAllLabels);
        btn.classList.toggle('border-cyan-400/50', stateShowAllLabels);
        btn.classList.toggle('text-cyan-300', stateShowAllLabels);
    }
    const isZoomedInClose = currentZoomScale2D >= 1.35;
    d3.selectAll('.node-text')
        .style('opacity', d => {
            if (stateShowAllLabels) return 0.95;
            if (d.degree >= 3 || d.isHub) return 0.95;
            return isZoomedInClose ? 0.9 : 0;
        });
};

window.toggleGraphArrows = function () {
    stateShowArrows = !stateShowArrows;
    const btn = document.getElementById('btnToggleArrows');
    if (btn) {
        btn.classList.toggle('bg-purple-500/20', stateShowArrows);
        btn.classList.toggle('border-purple-400/50', stateShowArrows);
        btn.classList.toggle('text-purple-300', stateShowArrows);
    }
    d3.selectAll('.graph-link')
        .attr('marker-end', stateShowArrows ? 'url(#obsidian-arrow)' : null);
};

window.toggleOrphanNodes = function () {
    stateHideOrphans = !stateHideOrphans;
    const btn = document.getElementById('btnToggleOrphans');
    if (btn) {
        btn.classList.toggle('bg-emerald-500/20', stateHideOrphans);
        btn.classList.toggle('border-emerald-400/50', stateHideOrphans);
        btn.classList.toggle('text-emerald-300', stateHideOrphans);
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

    renderLegend(currentGraphData);

    const nodeItems = d3.selectAll('.node-group');
    const linkLines = d3.selectAll('.graph-link');

    if (!activeFilterFolder) {
        nodeItems.style('opacity', 1);
        linkLines.style('stroke-opacity', 0.22);
        return;
    }

    nodeItems.style('opacity', function() {
        const itemFolder = d3.select(this).attr('data-folder');
        return itemFolder === activeFilterFolder ? 1 : 0.08;
    });

    linkLines.style('stroke-opacity', l => {
        const sFolder = l.source.folder || 'Root';
        const tFolder = l.target.folder || 'Root';
        return (sFolder === activeFilterFolder || tFolder === activeFilterFolder) ? 0.85 : 0.02;
    });
};

function bindGraphSearch() {
    const searchInput = document.getElementById('graphSearchInput') || document.getElementById('searchNoteInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const nodeItems = d3.selectAll('.node-group');
        const linkLines = d3.selectAll('.graph-link');

        if (!query) {
            nodeItems.style('opacity', 1);
            nodeItems.selectAll('.node-circle').style('stroke', d => d.degree >= 3 ? '#ffffff' : 'rgba(255,255,255,0.45)');
            linkLines.style('stroke-opacity', 0.22);
            return;
        }

        nodeItems.style('opacity', function(d) {
            const match = (d.name || '').toLowerCase().includes(query) || (d.path || '').toLowerCase().includes(query);
            return match ? 1 : 0.08;
        });

        nodeItems.selectAll('.node-circle')
            .style('stroke', function(d) {
                const match = (d.name || '').toLowerCase().includes(query) || (d.path || '').toLowerCase().includes(query);
                return match ? '#5de6ff' : (d.degree >= 3 ? '#ffffff' : 'rgba(255,255,255,0.45)');
            })
            .style('stroke-width', function(d) {
                const match = (d.name || '').toLowerCase().includes(query) || (d.path || '').toLowerCase().includes(query);
                return match ? '3px' : (d.degree >= 3 ? '1.8px' : '1px');
            });
    });
}

window.recenterGraphView = function () {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(750).call(
            zoomBehavior2D.transform,
            d3.zoomIdentity
        );
    }
};

window.zoomInGraph = function() {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(300).call(zoomBehavior2D.scaleBy, 1.35);
    }
};

window.zoomOutGraph = function() {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(300).call(zoomBehavior2D.scaleBy, 0.74);
    }
};

window.getCurrentGraphData = function () {
    return currentGraphData;
};

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderGraph();
});
