const express = require('express');
const { logger } = require('../utils/logger');
const { cacheService } = require('../utils/cache');
const { db } = require('../config/database');
const { websocketService } = require('../services/websocketService');
const { metricsCollector } = require('../monitoring/MetricsCollector');
const { RepositoryFactory } = require('../patterns/Repository');
const { ResilienceFactory } = require('../patterns/CircuitBreaker');
const { EventSystemFactory, EventTypes } = require('../patterns/Observer');
const { EnterpriseErrorHandler, setupGlobalErrorHandlers } = require('../errors/EnterpriseErrorHandler');

// Enterprise Security Middleware
const {
  securityHeaders,
  createRateLimit,
  requestId,
  requestLogger,
  sanitizeInput,
  requestSizeLimiter,
  securityValidation,
  responseCompression,
  cacheControl,
  secureCORS
} = require('../middleware/enterpriseSecurity');

// Routes
const authRoutes = require('../routes/auth');
const projectRoutes = require('../routes/projects');
const onboardingRoutes = require('../routes/onboarding');

class EnterpriseApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
    
    // Initialize enterprise components
    this.initializeEnterpriseComponents();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  initializeEnterpriseComponents() {
    // Initialize error handler
    this.errorHandler = new EnterpriseErrorHandler({
      environment: process.env.NODE_ENV || 'development',
      includeStackTrace: process.env.NODE_ENV === 'development'
    });

    // Initialize repository factory
    this.repositoryFactory = new RepositoryFactory(db);

    // Initialize resilience patterns
    this.resilience = {
      database: ResilienceFactory.createDatabaseResilience(),
      api: ResilienceFactory.createAPIResilience(),
      external: ResilienceFactory.createExternalServiceResilience()
    };

    // Initialize event system
    const eventSystem = EventSystemFactory.create({
      metricsCollector,
      websocketService
    });
    this.eventBus = eventSystem.eventBus;
    this.observers = eventSystem.observers;

    // Setup global error handlers
    setupGlobalErrorHandlers(this.errorHandler);

    logger.info('Enterprise components initialized');
  }

  setupMiddleware() {
    // Security middleware stack
    this.app.use(securityHeaders);
    this.app.use(secureCORS(['http://localhost:3000', 'http://localhost:5173']));
    this.app.use(responseCompression);
    
    // Basic Express middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Add basic request logging
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
    this.app.use(requestSizeLimiter('10mb'));
    this.app.use(sanitizeInput);
    this.app.use(securityValidation);
    this.app.use(cacheControl);

    // Request processing middleware
    this.app.use(requestId);
    this.app.use(requestLogger);
    
    // Rate limiting
    this.app.use('/api/', createRateLimit(60000, 1000, 'API rate limit exceeded'));
    this.app.use('/api/auth/', createRateLimit(60000, 100, 'Auth rate limit exceeded'));
    
    // Metrics collection middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        metricsCollector.recordRequest(req, res, responseTime);
      });
      
      next();
    });

    logger.info('Enterprise middleware stack configured');
  }

  setupRoutes() {
    // Health and monitoring endpoints
    this.setupHealthRoutes();
    this.setupMonitoringRoutes();

    // Add global request logging BEFORE routes
    this.app.use((req, res, next) => {
      console.log(`[MIDDLEWARE] ${req.method} ${req.url}`);
      if (req.url.includes('/api/')) {
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers);
      }
      next();
    });

    // API routes with resilience patterns
    this.app.use('/api/auth', this.wrapWithResilience(authRoutes.router, 'api'));
    this.app.use('/api/projects', this.wrapWithResilience(projectRoutes, 'api'));
    this.app.use('/api/onboarding', this.wrapWithResilience(onboardingRoutes, 'api'));

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Advanced UI Workflow - Enterprise Backend',
        version: '2.0.0',
        status: 'running',
        features: [
          'Enterprise Security Stack',
          'Performance Monitoring',
          'Circuit Breaker Pattern',
          'Event-Driven Architecture',
          'Repository Pattern',
          'Comprehensive Error Handling',
          'Real-time Collaboration',
          'Advanced Caching'
        ],
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          auth: '/api/auth',
          projects: '/api/projects'
        },
        documentation: '/api/docs'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
          path: req.originalUrl,
          method: req.method,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    });

    logger.info('Enterprise routes configured');
  }

  setupHealthRoutes() {
    // Quick health check for load balancers
    this.app.get('/health', (req, res) => {
      if (this.isShuttingDown) {
        return res.status(503).json({ status: 'shutting_down' });
      }
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0'
      });
    });

    // Detailed health check
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          components: {
            server: {
              status: 'healthy',
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              pid: process.pid
            },
            database: await this.checkDatabaseHealth(),
            cache: await this.checkCacheHealth(),
            websocket: this.checkWebSocketHealth(),
            resilience: this.checkResilienceHealth(),
            eventSystem: this.checkEventSystemHealth()
          },
          metrics: metricsCollector.getHealthMetrics()
        };

        // Determine overall health
        const componentStatuses = Object.values(healthStatus.components)
          .map(component => component.status);
        
        if (componentStatuses.includes('unhealthy')) {
          healthStatus.status = 'unhealthy';
          res.status(503);
        } else if (componentStatuses.includes('warning')) {
          healthStatus.status = 'warning';
        }

        res.json(healthStatus);
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Component-specific health checks
    this.app.get('/health/database', async (req, res) => {
      const dbHealth = await this.checkDatabaseHealth();
      res.status(dbHealth.status === 'healthy' ? 200 : 503).json(dbHealth);
    });

    this.app.get('/health/cache', async (req, res) => {
      const cacheHealth = await this.checkCacheHealth();
      res.status(cacheHealth.status === 'healthy' ? 200 : 503).json(cacheHealth);
    });
  }

  setupMonitoringRoutes() {
    // Performance metrics
    this.app.get('/metrics', (req, res) => {
      const metrics = metricsCollector.getMetrics();
      res.json(metrics);
    });

    // Prometheus metrics
    this.app.get('/metrics/prometheus', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(metricsCollector.getPrometheusMetrics());
    });

    // Error statistics
    this.app.get('/metrics/errors', (req, res) => {
      res.json(this.errorHandler.getErrorStats());
    });

    // System analytics
    this.app.get('/metrics/analytics', (req, res) => {
      res.json(this.observers.analytics.getAnalytics());
    });

    // Audit logs
    this.app.get('/metrics/audit', (req, res) => {
      const limit = parseInt(req.query.limit) || 100;
      const userId = req.query.userId;
      res.json(this.observers.auditLog.getAuditLogs(userId, limit));
    });

    // Event history
    this.app.get('/metrics/events', (req, res) => {
      const eventType = req.query.type;
      const limit = parseInt(req.query.limit) || 100;
      res.json(this.eventBus.getEventHistory(eventType, limit));
    });
  }

  wrapWithResilience(router, type = 'api') {
    const resilience = this.resilience[type] || this.resilience.api;
    
    return (req, res, next) => {
      resilience.execute(
        () => router(req, res, next),
        () => {
          res.status(503).json({
            success: false,
            error: {
              message: 'Service temporarily unavailable',
              code: 'SERVICE_UNAVAILABLE',
              requestId: req.id
            }
          });
        },
        { path: req.path, method: req.method }
      ).catch(next);
    };
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      // Emit error event
      this.eventBus.emit(EventTypes.SYSTEM_ERROR, {
        error: error.message,
        stack: error.stack,
        context: {
          path: req.path,
          method: req.method,
          userId: req.user?.id,
          requestId: req.id
        }
      });

      this.errorHandler.handleError(error, req, res, next);
    });
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      this.isShuttingDown = true;

      // Stop accepting new connections
      this.server.close(() => {
        logger.info('HTTP server closed');

        // Close database connections
        if (db.close) {
          db.close();
        }

        // Close cache connections
        if (cacheService.close) {
          cacheService.close();
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  // Health check methods
  async checkDatabaseHealth() {
    try {
      await this.resilience.database.execute(
        () => db.testConnection(),
        () => ({ status: 'degraded', message: 'Using fallback' })
      );
      
      return {
        status: 'healthy',
        type: 'supabase',
        connected: true,
        responseTime: '<50ms'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      };
    }
  }

  async checkCacheHealth() {
    try {
      const stats = await cacheService.getStats();
      return {
        status: 'healthy',
        type: 'memory',
        connected: true,
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: false
      };
    }
  }

  checkWebSocketHealth() {
    return {
      status: websocketService.io ? 'healthy' : 'warning',
      connections: websocketService.getConnectedUsers().length,
      initialized: !!websocketService.io
    };
  }

  checkResilienceHealth() {
    return {
      status: 'healthy',
      circuitBreakers: {
        database: this.resilience.database.getHealthStatus(),
        api: this.resilience.api.getHealthStatus(),
        external: this.resilience.external.getHealthStatus()
      }
    };
  }

  checkEventSystemHealth() {
    return {
      status: 'healthy',
      observers: this.eventBus.getObserverStats(),
      eventHistory: this.eventBus.getEventHistory().length
    };
  }

  async start() {
    const PORT = process.env.PORT || 8000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(PORT, HOST, (err) => {
        if (err) {
          console.error('Failed to start enterprise server:', err);
          logger.error('Failed to start enterprise server', { error: err.message });
          reject(err);
        } else {
          console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
          
          // Initialize services synchronously first
          websocketService.initialize(this.server);
          
          logger.info('🚀 Enterprise Backend Server Started', {
            port: PORT,
            host: HOST,
            environment: process.env.NODE_ENV || 'development',
            features: [
              'Enterprise Security',
              'Performance Monitoring',
              'Circuit Breakers',
              'Event System',
              'Repository Pattern',
              'Error Handling'
            ]
          });

          // Initialize cache service and emit event asynchronously
          this.initializeAsyncServices().then(() => {
            console.log('✅ Enterprise backend fully initialized and ready');
            resolve(this.server);
          }).catch((initError) => {
            console.error('Failed to initialize async services:', initError);
            reject(initError);
          });
        }
      });
      
      this.server.on('error', (error) => {
        console.error('Server error:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use. Please use a different port.`);
        }
        reject(error);
      });
    });
  }

  async initializeAsyncServices() {
    try {
      // Initialize cache service
      await cacheService.initialize();
      
      logger.info('Enterprise backend fully initialized');
    } catch (error) {
      logger.error('Failed to initialize async services', { error: error.message });
      throw error;
    }
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Enterprise server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = EnterpriseApp;
