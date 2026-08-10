class StatsService {
  getSystemStats() {
    return {
      activeNodes: 7,
      nodeIndigoLoad: '45%',
      anomalyOrangeLoad: '91%',
      systemSecurity: '95%'
    };
  }
}

module.exports = new StatsService();
