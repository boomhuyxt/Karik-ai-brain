const graphService = require('../obsidian/graph.service');
const progressService = require('../ai/progress.service');
const tokenService = require('../ai/token.service');

class DashboardService {
  async getDashboardData() {
    const nodesData = graphService.getGraphData();
    const tasksData = progressService.getTasks();
    const tokensData = await tokenService.getUsageSummary();

    return {
      nodes: nodesData.nodes,
      connections: nodesData.connections,
      tasks: tasksData.tasks,
      executionTime: tasksData.executionTime,
      tokens: tokensData,
      risk: {
        riskPercentage: 12,
        level: 'Low',
        statusText: 'Hệ thống an toàn. Không có mối đe dọa.'
      }
    };
  }
}

module.exports = new DashboardService();
