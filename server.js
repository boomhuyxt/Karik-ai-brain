const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const githubSyncJob = require('./src/jobs/githubSync.job');

const PORT = env.port || 3000;

const startServer = (portToTry) => {
  const server = app.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AI Brain JarVis (Clean Architecture + Modules) Active!`);
    console.log(`🌐 Dashboard URL: http://localhost:${portToTry}`);
    console.log(`📡 API Endpoints: http://localhost:${portToTry}/api/dashboard`);
    console.log(`=======================================================`);

    // Trigger initial background sync job in non-blocking fashion
    githubSyncJob.run().catch((err) => logger.error('Initial sync error:', err.message));
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`⚠️ Port ${portToTry} is in use. Trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      logger.error('Server startup error:', err);
    }
  });
};

startServer(Number(PORT));
