/**
 * System Monitoring, Token Consumption & API Risk Management Controller
 * Frontend client module for Obsidian Karik AI Brain
 */

(function () {
    let currentMonitoringData = null;
    let activeMonitorTab = 'token';

    // 1. Open / Close Modal
    window.openSystemMonitorModal = function () {
        const modal = document.getElementById('systemMonitoringModal');
        if (modal) {
            modal.classList.remove('hidden');
            window.fetchSystemMonitoringData();
        }
    };

    window.closeSystemMonitorModal = function () {
        const modal = document.getElementById('systemMonitoringModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    // Close on backdrop click or ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeSystemMonitorModal();
        }
    });

    // 2. Tab Navigation Switcher
    window.switchMonitorTab = function (tabKey) {
        activeMonitorTab = tabKey;

        // Tab Buttons
        const tabs = [
            { key: 'token', btnId: 'tabBtnToken', contentId: 'tabContentToken', activeClass: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-400/60 font-bold' },
            { key: 'progress', btnId: 'tabBtnProgress', contentId: 'tabContentProgress', activeClass: 'bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-400/60 font-bold' },
            { key: 'apirisk', btnId: 'tabBtnApiRisk', contentId: 'tabContentApiRisk', activeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-400/60 font-bold' }
        ];

        tabs.forEach(t => {
            const btn = document.getElementById(t.btnId);
            const content = document.getElementById(t.contentId);

            if (t.key === tabKey) {
                if (btn) {
                    btn.className = `monitor-tab-btn active px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border shadow-sm ${t.activeClass}`;
                }
                if (content) content.classList.remove('hidden');
            } else {
                if (btn) {
                    btn.className = 'monitor-tab-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5 border border-transparent';
                }
                if (content) content.classList.add('hidden');
            }
        });
    };

    // 3. Fetch Data from Backend API
    window.fetchSystemMonitoringData = async function () {
        const btnRefresh = document.getElementById('btnRefreshMonitorData');
        if (btnRefresh) {
            btnRefresh.classList.add('animate-spin');
        }

        try {
            const res = await fetch('/api/dashboard', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            currentMonitoringData = data;

            renderAllMonitoringViews(data);
        } catch (err) {
            console.warn('[SystemMonitoring] Failed to fetch live data:', err.message);
        } finally {
            if (btnRefresh) {
                setTimeout(() => btnRefresh.classList.remove('animate-spin'), 400);
            }
        }
    };

    // 4. Render All Views
    function renderAllMonitoringViews(data) {
        if (!data) return;

        // Render Top Risk Badge
        const overallRisk = data.apiHealth || {};
        const overallRiskBadge = document.getElementById('overallRiskBadge');
        if (overallRiskBadge) {
            const isSafe = (overallRisk.overallRiskScore || 0) < 25;
            overallRiskBadge.className = `text-[11px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isSafe 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
            }`;
            overallRiskBadge.innerHTML = `
                <span class="w-1.5 h-1.5 rounded-full ${isSafe ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
                <span>Rủi Ro: ${overallRisk.overallRiskScore || 6}% (${isSafe ? 'An Toàn' : 'Cần Chú Ý'})</span>
            `;
        }

        // Render Tab 1: Token Analytics
        renderTokenAnalytics(data.tokens);

        // Render Tab 2: Project Progress
        renderProjectProgress(data.projects);

        // Render Tab 3: API Risk Matrix
        renderApiRiskMatrix(data.apiHealth);
    }

    // --- TAB 1 RENDERER ---
    function renderTokenAnalytics(tokenData) {
        if (!tokenData) return;

        const kpiTotalTokens = document.getElementById('kpiTotalTokens');
        const kpiEstimatedCost = document.getElementById('kpiEstimatedCost');
        const kpiCostVnd = document.getElementById('kpiCostVnd');

        if (kpiTotalTokens) kpiTotalTokens.textContent = tokenData.totalTokens || '0';
        if (kpiEstimatedCost) kpiEstimatedCost.textContent = tokenData.estimatedCostUsd || '$0.00000';
        if (kpiCostVnd) kpiCostVnd.textContent = `~ ${tokenData.estimatedCostVnd || '0 ₫'} (Tiết kiệm 92%)`;

        // Render Agent Breakdown List
        const agentList = document.getElementById('agentTokenList');
        if (agentList && Array.isArray(tokenData.agents)) {
            agentList.innerHTML = tokenData.agents.map(ag => `
                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col gap-2.5 shadow-2xs">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${ag.color}"></span>
                            <span class="text-xs font-bold text-slate-900 dark:text-white">${ag.name}</span>
                            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">${ag.model}</span>
                        </div>
                        <div class="text-right font-mono">
                            <span class="text-xs font-bold text-slate-900 dark:text-white">${ag.usedTokens.toLocaleString()}</span>
                            <span class="text-[10px] text-slate-600 dark:text-slate-400 ml-0.5">Tokens (${ag.sharePct}%)</span>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                        <div class="h-full rounded-full transition-all duration-500" style="width: ${ag.sharePct}%; background-color: ${ag.color}"></div>
                    </div>

                    <!-- Metrics Breakdown -->
                    <div class="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        <span>Input: <strong class="text-slate-800 dark:text-slate-200">${ag.inputTokens.toLocaleString()}</strong> Tokens</span>
                        <span>Output: <strong class="text-slate-800 dark:text-slate-200">${ag.outputTokens.toLocaleString()}</strong> Tokens</span>
                        <span class="text-emerald-700 dark:text-emerald-400 font-semibold">Trạng thái: 🟢 Sẵn sàng</span>
                    </div>
                </div>
            `).join('');
        }

        // Render Provider Breakdown List
        const providerList = document.getElementById('providerTokenList');
        if (providerList && Array.isArray(tokenData.providers)) {
            providerList.innerHTML = tokenData.providers.map(p => `
                <div class="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-2xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${p.color}"></span>
                            <span class="text-xs font-bold text-slate-900 dark:text-slate-200">${p.name}</span>
                        </div>
                        <span class="text-[10px] text-slate-600 dark:text-slate-400 font-mono">Dung lượng: ${p.used.toLocaleString()} / ${p.max.toLocaleString()}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-bold text-slate-900 dark:text-white font-mono">${p.percentage}%</span>
                        <span class="text-[9px] block ${p.isLinked ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500'} font-mono">
                            ${p.isLinked ? '✓ Đã liên kết Key' : '○ Standby'}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- TAB 2 RENDERER ---
    function renderProjectProgress(projData) {
        if (!projData) return;

        const overallText = document.getElementById('overallProjectProgressText');
        const overallBar = document.getElementById('overallProjectProgressBar');
        if (overallText) overallText.textContent = `${projData.averageProgress || 0}%`;
        if (overallBar) overallBar.style.width = `${projData.averageProgress || 0}%`;

        const grid = document.getElementById('campaignListGrid');
        if (grid && Array.isArray(projData.campaigns)) {
            grid.innerHTML = projData.campaigns.map(camp => `
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3 transition-all hover:border-cyan-500/40 shadow-2xs">
                    <div>
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 font-semibold">
                                ${camp.category}
                            </span>
                            <span class="text-xs font-mono font-bold" style="color: ${camp.statusColor}">
                                ${camp.statusText} (${camp.progress}%)
                            </span>
                        </div>
                        <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${camp.name}</h4>
                        <span class="text-[10px] text-slate-600 dark:text-slate-400 block mt-1">Phụ trách: <strong class="text-slate-800 dark:text-slate-200">${camp.assignedAgent}</strong></span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                        <div class="h-full rounded-full transition-all duration-500" style="width: ${camp.progress}%; background-color: ${camp.statusColor}"></div>
                    </div>

                    <!-- Marketing / System Metrics -->
                    <div class="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-center text-[10px] font-mono">
                        ${camp.metrics.ctr ? `
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">CTR</span>
                                <span class="font-bold text-emerald-700 dark:text-emerald-400">${camp.metrics.ctr}</span>
                            </div>
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">CPC</span>
                                <span class="font-bold text-cyan-700 dark:text-cyan-400">${camp.metrics.cpc}</span>
                            </div>
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">ROAS</span>
                                <span class="font-bold text-amber-700 dark:text-amber-400">${camp.metrics.roas}</span>
                            </div>
                        ` : `
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">Notes</span>
                                <span class="font-bold text-purple-700 dark:text-purple-400">${camp.metrics.totalFiles || camp.metrics.variantsCreated || 0}</span>
                            </div>
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">Độ khớp</span>
                                <span class="font-bold text-emerald-700 dark:text-emerald-400">${camp.metrics.syncRate || camp.metrics.ctrEstimated || '100%'}</span>
                            </div>
                            <div>
                                <span class="text-slate-600 dark:text-slate-500 block">Rủi ro</span>
                                <span class="font-bold text-emerald-700 dark:text-emerald-400">${camp.risk.level} (${camp.risk.score}%)</span>
                            </div>
                        `}
                    </div>

                    <!-- Risk Alert Footer -->
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                        <span class="material-symbols-outlined text-xs text-emerald-700 dark:text-emerald-400">shield</span>
                        <span class="truncate">${camp.risk.alert}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- TAB 3 RENDERER ---
    function renderApiRiskMatrix(apiData) {
        if (!apiData) return;

        const summaryText = document.getElementById('overallRiskSummaryText');
        const connectedText = document.getElementById('connectedApisCountText');

        if (summaryText) {
            summaryText.textContent = `${apiData.overallLevel} (${apiData.overallRiskScore}% Risk Index)`;
            summaryText.style.color = apiData.overallColor || '#059669';
        }
        if (connectedText) {
            connectedText.textContent = `${apiData.connectedApis} / ${apiData.totalApis} Đang Online`;
        }

        const matrixList = document.getElementById('apiRiskMatrixList');
        if (matrixList && Array.isArray(apiData.apis)) {
            matrixList.innerHTML = apiData.apis.map(api => `
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-white/20 shadow-2xs">
                    <div class="flex items-start gap-3 min-w-[280px]">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                            api.status === 'connected' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-400/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-400/30'
                        }">
                            <span class="material-symbols-outlined text-lg">${api.status === 'connected' ? 'check_circle' : 'warning'}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="text-xs font-bold text-slate-900 dark:text-white">${api.name}</h4>
                                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">${api.type}</span>
                            </div>
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">${api.detail}</p>
                            <span class="text-[10px] text-cyan-800 dark:text-cyan-400/90 font-mono mt-1 block font-medium">Khuyến nghị: ${api.recommendation}</span>
                        </div>
                    </div>

                    <!-- Status & Risk Gauge -->
                    <div class="flex items-center gap-4 self-end md:self-center font-mono text-right">
                        <div>
                            <span class="text-[10px] text-slate-500 block">Độ trễ (Latency)</span>
                            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${api.latency}</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-500 block">Mức độ rủi ro</span>
                            <span class="text-xs font-bold ${api.riskScore < 20 ? 'text-emerald-700 dark:text-emerald-400' : (api.riskScore < 50 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}">
                                ${api.riskLevel} (${api.riskScore}%)
                            </span>
                        </div>
                        <div class="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-300 dark:border-white/5">
                            <div class="h-full rounded-full ${api.riskScore < 20 ? 'bg-emerald-500' : 'bg-amber-500'}" style="width: ${api.riskScore}%"></div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

})();
