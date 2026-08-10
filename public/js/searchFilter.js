/**
 * Search & Filter Nodes Module (Supports 3D Galaxy & 2D Circular Disc)
 */
function initSearchAndFilter() {
    const graphSearchInput = document.getElementById('graphSearchInput');
    if (graphSearchInput) {
        graphSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterGraphByQuery(query);
        });
    }

    window.filterGraphByFolder = function (folderName) {
        filterGraphByFolder(folderName);
    };
}

function filterGraphByQuery(query) {
    // 2D SVG Node Filtering
    const nodeGroups = d3.selectAll('.node-group');
    if (!nodeGroups.empty()) {
        if (!query) {
            nodeGroups.style('opacity', 1);
        } else {
            nodeGroups.style('opacity', d => {
                const matchName = (d.name || '').toLowerCase().includes(query);
                const matchPath = (d.path || '').toLowerCase().includes(query);
                const matchFolder = (d.folder || '').toLowerCase().includes(query);
                const matchType = (d.type || '').toLowerCase().includes(query);
                return (matchName || matchPath || matchFolder || matchType) ? 1 : 0.15;
            });
        }
    }

    // 3D Force Graph Node Filtering
    const graph3D = window.getGraph3DInstance ? window.getGraph3DInstance() : null;
    if (graph3D) {
        const graphData = graph3D.graphData();
        if (graphData && graphData.nodes) {
            graphData.nodes.forEach(n => {
                const isMatch = !query ||
                    (n.name || '').toLowerCase().includes(query) ||
                    (n.path || '').toLowerCase().includes(query) ||
                    (n.folder || '').toLowerCase().includes(query) ||
                    (n.type || '').toLowerCase().includes(query);

                if (n.__meshMat) {
                    n.__meshMat.opacity = isMatch ? 0.95 : 0.12;
                    n.__meshMat.emissiveIntensity = isMatch ? 0.6 : 0.05;
                }
                if (n.__sprite) {
                    n.__sprite.color = isMatch ? '#ffffff' : '#475569';
                }
            });
        }
    }
}

function filterGraphByFolder(folderName) {
    const folderLower = (folderName || '').toLowerCase().trim();

    // 2D SVG Folder Filtering
    const nodeGroups = d3.selectAll('.node-group');
    if (!nodeGroups.empty()) {
        nodeGroups.style('opacity', d => {
            if (!folderLower) return 1;
            return ((d.folder || '').toLowerCase() === folderLower) ? 1 : 0.15;
        });
    }

    // 3D Force Graph Folder Filtering
    const graph3D = window.getGraph3DInstance ? window.getGraph3DInstance() : null;
    if (graph3D) {
        const graphData = graph3D.graphData();
        if (graphData && graphData.nodes) {
            graphData.nodes.forEach(n => {
                const isMatch = !folderLower || (n.folder || '').toLowerCase() === folderLower;
                if (n.__meshMat) {
                    n.__meshMat.opacity = isMatch ? 0.95 : 0.12;
                    n.__meshMat.emissiveIntensity = isMatch ? 0.6 : 0.05;
                }
                if (n.__sprite) {
                    n.__sprite.color = isMatch ? '#ffffff' : '#475569';
                }
            });
        }
    }
}
