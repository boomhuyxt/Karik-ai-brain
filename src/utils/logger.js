const formatTime = () => new Date().toISOString();

const logger = {
  info: (msg, ...meta) => console.log(`[${formatTime()}] [INFO] ${msg}`, ...meta),
  warn: (msg, ...meta) => console.warn(`[${formatTime()}] [WARN] ${msg}`, ...meta),
  error: (msg, ...meta) => console.error(`[${formatTime()}] [ERROR] ${msg}`, ...meta),
  debug: (msg, ...meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${formatTime()}] [DEBUG] ${msg}`, ...meta);
    }
  }
};

module.exports = logger;
