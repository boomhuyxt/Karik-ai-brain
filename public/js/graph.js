/**
 * AI Graph Simulation Module - Supports 3D Galaxy & 2D Graph
 * Strictly enforces: 3D Titles are COMPLETELY HIDDEN when zoomed out,
 * and appear ONLY when zoomed in close enough (camera distance <= 200) or hovered!
 */
let currentGraphData = null;
let currentMode = '3d'; // '3d' | '2d'
let graph3DInstance = null;
let simulation2D = null;
let zoomBehavior2D = null;
let svgSelection2D = null;
let containerGroup2D = null;
let isAutoRotate = true;
let hoverNode3D = null;
let hoverNode2D = null;
let currentZoomScale2D = 1;

const highlightNodes3D = new Set();
const highlightLinks3D = new Set();

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

    const container3D = document.getElementById('graph3dContainer');
    const container2D = document.getElementById('graphSvg');

    if (currentMode === '3d') {
        if (container2D) {
            container2D.classList.add('hidden');
            container2D.classList.remove('block');
        }
        if (container3D) {
            container3D.classList.remove('hidden');
            container3D.classList.add('block');
        }
        render3DGalaxyGraph(data);
    } else {
        if (container3D) {
            container3D.classList.add('hidden');
            container3D.classList.remove('block');
        }
        if (container2D) {
            container2D.classList.remove('hidden');
            container2D.classList.add('block');
        }
        render2DGraph(data);
    }
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
        legendList.innerHTML = categories.map(cat => `
            <div class="flex items-center justify-between gap-3 text-xs font-bold text-white bg-white/5 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/15 transition-all cursor-pointer shadow-sm group" onclick="window.filterGraphByFolder('${cat.folder}')">
                <div class="flex items-center gap-2">
                    <span class="w-3.5 h-3.5 rounded-full" style="background: ${cat.color}; box-shadow: 0 0 10px ${cat.color}"></span>
                    <span class="text-white font-bold tracking-wide text-xs">${cat.folder}</span>
                </div>
                <span class="text-[10px] text-secondary font-mono uppercase bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded">Thư mục</span>
            </div>
        `).join('');
    } else {
        legendList.innerHTML = '<div class="text-xs text-on-surface-variant italic">Không có thư mục</div>';
    }
}

/* ==========================================================
   1. 3D GALAXY GRAPH MODE (Hình Cầu Đặc Ruột 3D)
   - Node nhiều liên kết ở tâm 3D (0,0,0)
   - Tiêu đề 3D ẨN HOÀN TOÀN khi zoom xa, CHỈ HIỆN KHI ZOOM ĐỦ GẦN (camDist <= 200) hoặc khi Hover!
   ========================================================== */
function render3DGalaxyGraph(data) {
    const container = document.getElementById('graph3dContainer');
    if (!container) return;

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
    const n = nodes.length;

    const outerRadius = Math.max(220, Math.cbrt(n || 1) * 85 + 80);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    nodes.forEach((node, rank) => {
        if (rank === 0) {
            node.x = 0;
            node.y = 0;
            node.z = 0;
            node.__targetRadius = 0;
            node.isCentralHub = true;
        } else {
            const radiusFraction = Math.pow(rank / Math.max(1, n - 1), 0.65);
            const nodeRadius = outerRadius * radiusFraction;

            const y = n > 1 ? 1 - (2 * rank) / (n - 1) : 0;
            const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
            const theta = rank * goldenAngle;

            node.x = nodeRadius * radiusAtY * Math.cos(theta);
            node.y = nodeRadius * y;
            node.z = nodeRadius * radiusAtY * Math.sin(theta);
            node.__targetRadius = nodeRadius;
        }

        node.neighbors = [];
        node.links = [];
    });

    const nodeById = new Map(nodes.map(node => [node.id, node]));
    links.forEach(link => {
        const a = typeof link.source === 'object' ? link.source : nodeById.get(link.source);
        const b = typeof link.target === 'object' ? link.target : nodeById.get(link.target);
        if (a && b) {
            a.neighbors.push(b);
            b.neighbors.push(a);
            a.links.push(link);
            b.links.push(link);
        }
    });

    container.innerHTML = '';

    if (typeof ForceGraph3D === 'undefined') {
        console.warn('ForceGraph3D not loaded, switching to 2D.');
        window.setGraphMode('2d');
        return;
    }

    graph3DInstance = ForceGraph3D()(container)
        .graphData({ nodes, links })
        .backgroundColor('rgba(0,0,0,0)')
        .showNavInfo(false)
        .nodeRelSize(6)
        .nodeVal(d => d.isCentralHub ? 18 : (5 + Math.min(12, (d.degree || 0) * 2.5)))
        .nodeColor(d => d === maxDegreeNode ? '#ffffff' : (d.color || '#d3bbff'))
        .nodeLabel(d => {
            if (!graph3DInstance) return '';
            const camPos = graph3DInstance.cameraPosition();
            const camDist = Math.hypot(camPos.x, camPos.y, camPos.z);
            if (camDist > 200 && hoverNode3D !== d) return ''; // Hide HTML tooltip when zoomed out
            return `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: rgba(16,19,26,0.95); padding: 4px 8px; border-radius: 6px; border: 1px solid ${d.color || '#d3bbff'}; color: #fff; box-shadow: 0 0 12px ${d.color || '#d3bbff'}"><b>${d.name}</b> <span style="color:#5de6ff">(${d.degree || 0} liên kết)</span></div>`;
        })
        .linkWidth(link => highlightLinks3D.has(link) ? 2.5 : 1)
        .linkColor(link => highlightLinks3D.has(link) ? '#ffffff' : (link.color || '#d3bbff'))
        .linkOpacity(0.35)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(link => highlightLinks3D.has(link) ? 3 : 1.5)
        .linkDirectionalParticleSpeed(0.006)
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            const nodeRadius = node.isCentralHub ? 12 : (5 + Math.min(10, (node.degree || 0) * 1.8));
            const geom = new THREE.SphereGeometry(nodeRadius, 24, 24);
            const colorHex = node === maxDegreeNode ? '#ffffff' : (node.color || '#d3bbff');
            const mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color(colorHex),
                emissive: new THREE.Color(colorHex),
                emissiveIntensity: node.isCentralHub ? 0.9 : 0.6,
                shininess: 95,
                transparent: true,
                opacity: 0.95
            });
            const mesh = new THREE.Mesh(geom, mat);
            group.add(mesh);
            node.__meshMat = mat;

            // 3D Sprite Text Label (Hidden initially until zoomed in close or hovered)
            if (typeof SpriteText !== 'undefined') {
                const sprite = new SpriteText(node.name || '');
                sprite.color = '#ffffff';
                sprite.textHeight = 4.5 + Math.min(3, (node.degree || 0) * 0.5);
                sprite.fontFace = 'JetBrains Mono, sans-serif';
                sprite.fontStyle = 'bold';
                sprite.position.set(0, nodeRadius + 6, 0);
                sprite.backgroundColor = 'rgba(16, 19, 26, 0.8)';
                sprite.padding = [2, 5];
                sprite.borderRadius = 4;
                sprite.borderWidth = 0.5;
                sprite.borderColor = colorHex;
                sprite.visible = false; // Hidden by default when zoomed out!
                group.add(sprite);
                node.__sprite = sprite;
            }

            return group;
        })
        .onNodeClick(node => {
            if (!node) return;
            const distance = 90;
            const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
            graph3DInstance.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                { x: node.x, y: node.y, z: node.z },
                1200
            );

            if (typeof window.openNoteDrawer === 'function' && node.path) {
                window.openNoteDrawer(node.path);
            }
        })
        .onNodeHover(node => {
            if ((!node && !hoverNode3D) || (node && hoverNode3D === node)) return;

            highlightNodes3D.clear();
            highlightLinks3D.clear();

            if (node) {
                highlightNodes3D.add(node);
                if (node.neighbors) node.neighbors.forEach(n => highlightNodes3D.add(n));
                if (node.links) node.links.forEach(l => highlightLinks3D.add(l));
            }

            hoverNode3D = node || null;

            nodes.forEach(n => {
                if (!n.__meshMat) return;
                if (!hoverNode3D) {
                    n.__meshMat.opacity = 0.95;
                    n.__meshMat.emissiveIntensity = n.isCentralHub ? 0.9 : 0.6;
                } else if (highlightNodes3D.has(n)) {
                    n.__meshMat.opacity = 1.0;
                    n.__meshMat.emissiveIntensity = 0.95;
                } else {
                    n.__meshMat.opacity = 0.15;
                    n.__meshMat.emissiveIntensity = 0.1;
                }
            });

            update3DSpriteVisibility(nodes);

            graph3DInstance
                .linkWidth(graph3DInstance.linkWidth())
                .linkColor(graph3DInstance.linkColor())
                .linkDirectionalParticleWidth(graph3DInstance.linkDirectionalParticleWidth());
        });

    graph3DInstance.d3Force('radial', d3.forceRadial(d => d.__targetRadius || 0, 0, 0, 0).strength(0.95));
    graph3DInstance.d3Force('collide', d3.forceCollide(26).strength(0.95));
    graph3DInstance.d3Force('charge', d3.forceManyBody().strength(-60));
    graph3DInstance.d3Force('link', d3.forceLink(links).id(d => d.id).distance(60).strength(0.35));

    // Set initial camera position far away (z = 380) so all 3D titles are hidden initially
    graph3DInstance.cameraPosition({ x: 0, y: 0, z: 380 }, { x: 0, y: 0, z: 0 }, 0);

    try {
        const scene = graph3DInstance.scene();
        if (scene) {
            const shellGeom = new THREE.SphereGeometry(outerRadius + 20, 24, 24);
            const shellMat = new THREE.MeshBasicMaterial({
                color: 0xd3bbff,
                wireframe: true,
                transparent: true,
                opacity: 0.08
            });
            const shellMesh = new THREE.Mesh(shellGeom, shellMat);
            scene.add(shellMesh);
        }
    } catch (e) {
        console.warn('Wireframe shell skip:', e);
    }

    const controls = graph3DInstance.controls();
    if (controls) {
        controls.autoRotate = isAutoRotate;
        controls.autoRotateSpeed = 1.2;
        controls.addEventListener('change', () => update3DSpriteVisibility(nodes));
    }

    update3DSpriteVisibility(nodes);
}

function update3DSpriteVisibility(nodes) {
    if (!graph3DInstance) return;
    const camPos = graph3DInstance.cameraPosition();
    const camDist = Math.hypot(camPos.x, camPos.y, camPos.z);
    
    // Zoom threshold: ONLY show 3D titles when camera is zoomed in VERY close (dist <= 200)
    const isZoomedInClose = camDist <= 200;

    nodes.forEach(n => {
        if (n.__sprite) {
            const isHovered = hoverNode3D && (n === hoverNode3D || (n.neighbors && n.neighbors.includes(hoverNode3D)));
            n.__sprite.visible = isZoomedInClose || isHovered;

            if (n === hoverNode3D) {
                n.__sprite.color = '#ffffff';
                n.__sprite.backgroundColor = 'rgba(109, 40, 217, 0.95)';
                n.__sprite.borderColor = '#5de6ff';
            } else {
                n.__sprite.color = '#e2e8f0';
                n.__sprite.backgroundColor = 'rgba(16, 19, 26, 0.8)';
                n.__sprite.borderColor = n.color || '#d3bbff';
            }
        }
    });
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
   3. GLOBAL EXPORTS & CONTROLS
   ========================================================== */
window.setGraphMode = function (mode) {
    currentMode = mode;

    const btn3D = document.getElementById('btnMode3D');
    const btn2D = document.getElementById('btnMode2D');

    if (btn3D) {
        btn3D.className = mode === '3d'
            ? 'px-3 py-1 rounded-lg font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(211,187,255,0.3)]'
            : 'px-3 py-1 rounded-lg font-semibold text-on-surface-variant hover:bg-white/10 flex items-center gap-1.5 transition-all';
    }

    if (btn2D) {
        btn2D.className = mode === '2d'
            ? 'px-3 py-1 rounded-lg font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(211,187,255,0.3)]'
            : 'px-3 py-1 rounded-lg font-semibold text-on-surface-variant hover:bg-white/10 flex items-center gap-1.5 transition-all';
    }

    if (currentGraphData) renderGraph(currentGraphData);
};

window.toggleAutoRotate = function () {
    isAutoRotate = !isAutoRotate;
    const btn = document.getElementById('btnToggleRotate');
    if (btn) {
        btn.className = isAutoRotate
            ? 'px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-semibold transition-all shadow-[0_0_8px_rgba(52,211,153,0.2)]'
            : 'px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-on-surface-variant border border-white/10 flex items-center gap-1.5 font-semibold transition-all';
    }

    if (graph3DInstance && graph3DInstance.controls()) {
        graph3DInstance.controls().autoRotate = isAutoRotate;
    }
};

window.recenterGraphView = function () {
    if (currentMode === '3d' && graph3DInstance) {
        graph3DInstance.cameraPosition({ x: 0, y: 0, z: 380 }, { x: 0, y: 0, z: 0 }, 1000);
    } else if (svgSelection2D && zoomBehavior2D) {
        svgSelection2D.transition().duration(750).call(
            zoomBehavior2D.transform,
            d3.zoomIdentity
        );
    }
};

window.getGraph3DInstance = function () {
    return graph3DInstance;
};

window.getCurrentGraphData = function () {
    return currentGraphData;
};
