/**
 * AI Graph Simulation Module - 2D Obsidian Constellation Graph
 */
let currentGraphData = null;
let simulation2D = null;
let zoomBehavior2D = null;
let svgSelection2D = null;
let containerGroup2D = null;
let hoverNode2D = null;
let currentZoomScale2D = 1;

async function fetchAndRenderGraph() {
    try {
        const res = await fetch('/api/nodes');
        if (!res.ok) throw new Error('Failed to load graph data');
        currentGraphData = await res.json();
        if (currentGraphData && currentGraphData.repo) {
            const repoBadge = document.getElementById('repoNameBadge');
            if (repoBadge) repoBadge.textContent = currentGraphData.repo;
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
        legendList.innerHTML = categories.map(cat => {
            const isManager = (cat.folder || '').toLowerCase().includes('manager');
            const itemBg = isManager 
                ? `bg-gradient-to-r from-[#ff3366]/25 to-rose-950/50 border-[#ff3366]/70 shadow-[0_0_14px_rgba(255,51,102,0.45)] animate-pulse` 
                : `bg-white/5 hover:bg-white/15 border-white/15 shadow-sm`;
            const badgeBg = isManager 
                ? `bg-[#ff3366]/30 text-[#ff3366] border-[#ff3366]/60 font-black shadow-[0_0_8px_rgba(255,51,102,0.5)]` 
                : `bg-secondary/10 text-secondary border-secondary/20`;

            return `
            <div class="flex items-center justify-between gap-3 text-xs font-bold text-white ${itemBg} px-3 py-1.5 rounded-lg border transition-all cursor-pointer group hover:scale-[1.03]" onclick="window.filterGraphByFolder('${cat.folder}')">
                <div class="flex items-center gap-2">
                    <span class="w-3.5 h-3.5 rounded-full" style="background: ${cat.color}; box-shadow: 0 0 12px ${cat.color}"></span>
                    <span class="text-white font-bold tracking-wide text-xs ${isManager ? 'text-rose-100 text-glow font-extrabold' : ''}">${cat.folder}</span>
                </div>
                <span class="text-[10px] font-mono uppercase ${badgeBg} border px-1.5 py-0.5 rounded">Thư mục</span>
            </div>
            `;
        }).join('');
    } else {
        legendList.innerHTML = '<div class="text-xs text-on-surface-variant italic">Không có thư mục</div>';
    }
}

/* ==========================================================
   2. 2D OBSIDIAN CONSTELLATION GRAPH MODE
   - Spacious node layout
   - Title labels appear ONLY when zoomed in close enough (scale >= 1.6x)
   - Hovering over a node clearly highlights its title label!
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

    const nodes = (data.nodes || []).map(d => ({ ...d }));
    const links = (data.connections || []).map(d => ({ ...d }));

    const degreeMap = new Map();
    links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
        degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    });

    nodes.forEach(n => {
        n.degree = degreeMap.get(n.id) || 0;
    });

    nodes.sort((a, b) => b.degree - a.degree);
    const maxDegreeNode = nodes[0];

    const folderMap = new Map();
    nodes.forEach(n => {
        const f = n.folder || 'root';
        if (!folderMap.has(f)) folderMap.set(f, []);
        folderMap.get(f).push(n);
    });

    const folderNames = Array.from(folderMap.keys());
    const folderAngleMap = new Map();
    folderNames.forEach((folder, idx) => {
        const angle = (idx / (folderNames.length || 1)) * Math.PI * 2;
        folderAngleMap.set(folder, angle);
    });

    nodes.forEach((node, i) => {
        if (node === maxDegreeNode || (i < Math.max(4, nodes.length * 0.18) && node.degree >= 2)) {
            const r = i === 0 ? 0 : 30 + Math.random() * 80;
            const theta = Math.random() * Math.PI * 2;
            node.x = cx + r * Math.cos(theta);
            node.y = cy + r * Math.sin(theta);
            node.__targetRadius = r;
            node.isCentralCore = true;
        } else if (node.degree >= 1) {
            const folderAngle = folderAngleMap.get(node.folder || 'root') || (i * 0.5);
            const clusterDist = 240 + (i % 3) * 55;
            const jitterAngle = (Math.random() - 0.5) * 0.4;
            const finalAngle = folderAngle + jitterAngle;

            node.x = cx + clusterDist * Math.cos(finalAngle);
            node.y = cy + clusterDist * Math.sin(finalAngle);
            node.__targetRadius = clusterDist;
            node.isSatellite = true;
        } else {
            const outerDist = 420 + Math.random() * 90;
            const theta = (i / (nodes.length || 1)) * Math.PI * 2;
            node.x = cx + outerDist * Math.cos(theta);
            node.y = cy + outerDist * Math.sin(theta);
            node.__targetRadius = outerDist;
            node.isOuter = true;
        }
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));
    links.forEach(link => {
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
        }
    });

    svgSelection2D = svg;
    containerGroup2D = svg.append('g');

    currentZoomScale2D = 1;
    zoomBehavior2D = d3.zoom()
        .scaleExtent([0.15, 6])
        .on('zoom', (event) => {
            currentZoomScale2D = event.transform.k;
            containerGroup2D.attr('transform', event.transform);

            const isZoomedInClose = currentZoomScale2D >= 1.6;
            nodeItems.selectAll('.node-text')
                .style('opacity', d => {
                    const isHovered = hoverNode2D && (hoverNode2D === d || (d.neighbors && d.neighbors.includes(hoverNode2D)));
                    return (isZoomedInClose || isHovered) ? 1 : 0;
                });
        });

    svg.call(zoomBehavior2D);

    simulation2D = d3.forceSimulation(nodes)
        .force('center', d3.forceCenter(cx, cy))
        .force('radial', d3.forceRadial(d => d.__targetRadius, cx, cy).strength(0.75))
        .force('collide', d3.forceCollide(d => (d.isCentralCore ? 18 : 12) + 16).strength(0.95))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('link', d3.forceLink(links).id(d => d.id).distance(l => {
            const sFolder = l.source.folder || 'root';
            const tFolder = l.target.folder || 'root';
            return (sFolder === tFolder) ? 65 : 160;
        }).strength(0.35));

    const linkGroup = containerGroup2D.append('g').attr('class', 'links-layer');
    const linkLines = linkGroup
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke', '#a1a1aa')
        .attr('stroke-width', 1.0)
        .attr('stroke-opacity', 0.28);

    const nodeGroup = containerGroup2D.append('g').attr('class', 'nodes-layer');
    const nodeItems = nodeGroup
        .selectAll('.node-group')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node-group')
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

    nodeItems.append('circle')
        .attr('class', 'node-circle')
        .attr('r', d => d === maxDegreeNode ? 9 : (d.isCentralCore ? 6.5 : (d.degree > 1 ? 5.5 : 4.2)))
        .attr('fill', d => d === maxDegreeNode ? '#e2e8f0' : (d.color || '#cbd5e1'))
        .attr('stroke', d => d === maxDegreeNode ? '#ffffff' : 'rgba(255,255,255,0.4)')
        .attr('stroke-width', d => d === maxDegreeNode ? '2.5px' : '1px')
        .style('filter', d => d === maxDegreeNode ? 'drop-shadow(0 0 12px #d3bbff)' : `drop-shadow(0 0 6px ${d.color || '#cbd5e1'})`);

    nodeItems.append('text')
        .attr('class', 'node-text')
        .attr('dx', d => (d === maxDegreeNode ? 13 : 9))
        .attr('dy', 4)
        .attr('font-size', '11px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', '#e1e2eb')
        .style('opacity', 0)
        .style('pointer-events', 'none')
        .style('transition', 'opacity 0.2s ease, fill 0.2s ease')
        .style('text-shadow', '0 0 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)')
        .text(d => d.name);

    simulation2D.on('tick', () => {
        linkLines
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodeItems.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function highlightNode2D(d) {
        hoverNode2D = d;
        const neighborSet = new Set(d.neighbors || []);
        neighborSet.add(d);
        const linkSet = new Set(d.links || []);

        nodeItems.style('opacity', n => neighborSet.has(n) ? 1 : 0.12);

        const isZoomedInClose = currentZoomScale2D >= 1.6;
        nodeItems.selectAll('.node-text')
            .style('opacity', n => (isZoomedInClose || neighborSet.has(n)) ? 1 : 0)
            .style('fill', n => n === d ? '#5de6ff' : '#e1e2eb')
            .style('font-weight', n => n === d ? 'bold' : 'normal');

        linkLines
            .style('stroke-opacity', l => linkSet.has(l) ? 0.9 : 0.05)
            .style('stroke-width', l => linkSet.has(l) ? 2.2 : 0.8)
            .attr('stroke', l => linkSet.has(l) ? '#ffffff' : '#a1a1aa');
    }

    function unhighlightNode2D() {
        hoverNode2D = null;
        nodeItems.style('opacity', 1);

        const isZoomedInClose = currentZoomScale2D >= 1.6;
        nodeItems.selectAll('.node-text')
            .style('opacity', isZoomedInClose ? 1 : 0)
            .style('fill', '#e1e2eb')
            .style('font-weight', 'normal');

        linkLines
            .style('stroke-opacity', 0.28)
            .style('stroke-width', 1.0)
            .attr('stroke', '#a1a1aa');
    }
}

/* ==========================================================
   2. GLOBAL EXPORTS & CONTROLS
   ========================================================== */
window.recenterGraphView = function () {
    if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(750).call(
            zoomBehavior2D.transform,
            d3.zoomIdentity
        );
    }
};

window.getCurrentGraphData = function () {
    return currentGraphData;
};
