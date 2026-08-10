class AnalyticsService {
  getAnalytics() {
    return {
      dailyTokenBurnRate: 14200,
      monthlyEstimatedCost: '$1.45',
      activeModels: 5,
      ragQueryCount: 128
    };
  }
}

module.exports = new AnalyticsService();
