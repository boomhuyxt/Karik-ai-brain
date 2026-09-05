/**
 * Search & Filter Nodes Module
 */
function initSearchAndFilter() {
    const graphSearchInput = document.getElementById('graphSearchInput');
    if (graphSearchInput) {
        graphSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterGraphByQuery(query);
        });
    }

    // Only set fallback filterGraphByFolder if graph.js has not defined it
    if (typeof window.filterGraphByFolder !== 'function') {
        window.filterGraphByFolder = function (folderName) {
            filterGraphByFolderInternal(folderName);
        };
    }
}

function filterGraphByQuery(query) {
    if (typeof window.applyCurrentFilters === 'function') {
        // graph.js handles sync and filtering comprehensively
        return;
    }

    // 2D SVG Node Filtering fallback
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
}

function filterGraphByFolderInternal(folderName) {
    const folderLower = (folderName || '').toLowerCase().trim();

    // 2D SVG Folder Filtering fallback
    const nodeGroups = d3.selectAll('.node-group');
    if (!nodeGroups.empty()) {
        nodeGroups.style('opacity', d => {
            if (!folderLower) return 1;
            return ((d.folder || '').toLowerCase() === folderLower) ? 1 : 0.15;
        });
    }
}

