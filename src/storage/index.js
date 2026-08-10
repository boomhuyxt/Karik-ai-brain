const path = require('path');
const fs = require('fs');

const storageDirs = ['uploads', 'cache', 'temp', 'logs'];

storageDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

module.exports = {
  storagePath: __dirname,
  uploadsPath: path.join(__dirname, 'uploads'),
  cachePath: path.join(__dirname, 'cache'),
  tempPath: path.join(__dirname, 'temp'),
  logsPath: path.join(__dirname, 'logs')
};
