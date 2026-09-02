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

// Trust Cloudflare Tunnel / Reverse Proxy headers (cf-connecting-ip)
app.set('trust proxy', true);

// Middlewares
app.use(corsMiddleware);
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));
app.use(requestLogger);
app.use(rateLimit({ windowMs: 60000, max: 200 }));
app.use(authMiddleware);

// Serve static dashboard files and uploaded files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'src/storage/uploads')));

// Graphview shortcut endpoint
app.get('/graphview', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'graphview.html'));
});

// Login & Register shortcut endpoint
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Models viewer shortcut endpoint
app.get('/models', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'models.html'));
});

// Documentation & Architecture shortcut endpoint
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// Primary REST API Router
app.use('/api', apiRoutes);

// Global Error Middleware
app.use(errorHandler);

module.exports = app;
