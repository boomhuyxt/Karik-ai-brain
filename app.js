const express = require('express');
const path = require('path');
require('dotenv').config();

const corsMiddleware = require('./src/middlewares/cors');
const requestLogger = require('./src/middlewares/logger');
const rateLimit = require('./src/middlewares/rateLimit');
const authMiddleware = require('./src/middlewares/auth');
const errorHandler = require('./src/middlewares/error');
const apiRoutes = require('./src/routes');

// Ensure storage paths exist
require('./src/storage');

const app = express();

// Middlewares
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(rateLimit({ windowMs: 60000, max: 200 }));
app.use(authMiddleware);

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Graphview shortcut endpoint
app.get('/graphview', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'graphview.html'));
});

// Primary REST API Router
app.use('/api', apiRoutes);

// Global Error Middleware
app.use(errorHandler);

module.exports = app;
