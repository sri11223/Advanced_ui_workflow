const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { config } = require('./config');
const { logger } = require('./utils/logger');
const { cacheService } = require('./utils/cache');
const { db } = require('./config/database');
const { websocketService } = require('./services/websocketService');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const onboardingRoutes = require('./routes/onboarding');

class App {
  constructor() {
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Mount API routes
    this.app.use('/api/auth', authRoutes.router);
    this.app.use('/api/projects', projectRoutes);
    this.app.use('/api/onboarding', onboardingRoutes);

    // Basic health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        server: 'running',
        port: process.env.PORT || 8000
      });
    });

    // Comprehensive health check
    this.app.get('/health/detailed', async (req, res) => {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        },
        database: {
          status: 'not_configured', // Will be updated when DB is connected
          connection: false
        },
        websocket: {
          status: 'not_configured', // Will be updated when WS is connected
          connections: 0
        },
        cache: {
          status: 'memory_only',
          type: 'in-memory',
          connected: true
        },
        routes: {
          '/health': 'active',
          '/api': 'active',
          '/api/auth': 'active',
          '/api/projects': 'active',
          '/wireframes': 'not_configured'
        }
      };

      res.json(healthStatus);
    });

    // API info
    this.app.get('/api', (req, res) => {
      res.json({ 
        message: 'Advanced UI Workflow Backend API', 
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          detailed_health: '/health/detailed',
          api_info: '/api'
        }
      });
    });

    // Test database endpoint (placeholder)
    this.app.get('/health/database', (req, res) => {
      res.json({
        status: 'not_configured',
        message: 'Supabase database not yet configured',
        timestamp: new Date().toISOString()
      });
    });

    // Test WebSocket endpoint (placeholder)
    this.app.get('/health/websocket', (req, res) => {
      res.json({
        status: 'not_configured',
        message: 'WebSocket service not yet configured',
        timestamp: new Date().toISOString()
      });
    });

    // Test cache endpoint
    this.app.get('/health/cache', (req, res) => {
      res.json({
        status: 'active',
        type: 'memory',
        message: 'Memory cache is working',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  start() {
    const PORT = process.env.PORT || 8000;
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(PORT, (err) => {
        if (err) {
          console.error('Failed to start server:', err);
          reject(err);
        } else {
          console.log(`Server running on port ${PORT}`);
          
          // Initialize WebSocket service
          websocketService.initialize(this.server);
          
          resolve(this.server);
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Server stopped');
        resolve();
      });
    });
  }
}

module.exports = App;
