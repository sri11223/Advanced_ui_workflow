import { Router } from 'express';
import { db } from '../config/database';
import { cacheService } from '../utils/cache';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    const dbHealth = await checkDatabaseHealth();
    
    // Check cache connection
    const cacheHealth = await checkCacheHealth();
    
    // Check memory usage
    const memoryHealth = checkMemoryHealth();
    
    const responseTime = Date.now() - startTime;
    const isHealthy = dbHealth.status === 'healthy' && 
                     cacheHealth.status === 'healthy' && 
                     memoryHealth.status === 'healthy';

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        cache: cacheHealth,
        memory: memoryHealth
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    };

    res.status(isHealthy ? 200 : 503).json(healthData);
  } catch (error: any) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Comprehensive health checks
    const [dbHealth, cacheHealth, memoryHealth, diskHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkMemoryHealth(),
      checkDiskHealth()
    ]);
    
    const responseTime = Date.now() - startTime;
    const services = { database: dbHealth, cache: cacheHealth, memory: memoryHealth, disk: diskHealth };
    const isHealthy = Object.values(services).every(service => service.status === 'healthy');

    const detailedHealth = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      responseTime: `${responseTime}ms`,
      services,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        pid: process.pid,
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    res.status(isHealthy ? 200 : 503).json(detailedHealth);
  } catch (error: any) {
    logger.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const dbReady = await checkDatabaseReadiness();
    const cacheReady = await checkCacheReadiness();
    
    const isReady = dbReady && cacheReady;
    
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date(),
      checks: {
        database: dbReady,
        cache: cacheReady
      }
    });
  } catch (error: any) {
    logger.error('Readiness check error:', error);
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Helper functions
async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    
    // Test database connection with a simple query
    const testResult = await db.query('SELECT 1 as test');
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      message: 'Database connection successful'
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

async function checkCacheHealth() {
  try {
    const startTime = Date.now();
    
    // Test cache with set/get operation
    const testKey = 'health_check_test';
    const testValue = 'test_value';
    
    await cacheService.set(testKey, testValue, 10); // 10 second TTL
    const retrievedValue = await cacheService.get(testKey);
    await cacheService.delete(testKey);
    
    const responseTime = Date.now() - startTime;
    
    if (retrievedValue === testValue) {
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        message: 'Cache operations successful'
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Cache value mismatch'
      };
    }
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Cache operations failed'
    };
  }
}

function checkMemoryHealth() {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    const status = memoryUsagePercent > 90 ? 'unhealthy' : 'healthy';
    
    return {
      status,
      usage: {
        heapUsed: `${Math.round(usedMem / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(totalMem / 1024 / 1024)}MB`,
        percentage: `${memoryUsagePercent.toFixed(2)}%`
      },
      message: status === 'healthy' ? 'Memory usage within limits' : 'High memory usage detected'
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Memory check failed'
    };
  }
}

async function checkDiskHealth() {
  try {
    // Simple disk space check (this is basic, could be enhanced with actual disk space monitoring)
    const stats = await import('fs').then(fs => fs.promises.stat('.'));
    
    return {
      status: 'healthy',
      message: 'Disk access successful'
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: error.message,
      message: 'Disk access failed'
    };
  }
}

async function checkDatabaseReadiness() {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function checkCacheReadiness() {
  try {
    await cacheService.get('readiness_test');
    return true;
  } catch {
    return false;
  }
}

export default router;
