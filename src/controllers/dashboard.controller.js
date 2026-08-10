const dashboardService = require('../services/dashboard/dashboard.service');

class DashboardController {
  async getDashboard(req, res, next) {
    try {
      const data = await dashboardService.getDashboardData();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
