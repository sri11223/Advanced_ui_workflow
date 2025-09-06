const os = require('os');
const { logger } = require('../utils/logger');

// Performance Metrics Collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byMethod: {},
        byPath: {},
        byStatusCode: {}
      },
      performance: {
        responseTime: {
          min: Infinity,
          max: 0,
          avg: 0,
          p95: 0,
          p99: 0,
          samples: []
        },
        throughput: {
          requestsPerSecond: 0,
          requestsPerMinute: 0
        }
      },
      system: {
        memory: {},
        cpu: {},
        uptime: 0,
        connections: 0
      },
      database: {
        connections: {
          active: 0,
          idle: 0,
          total: 0
        },
        queries: {
          total: 0,
          slow: 0,
          failed: 0,
          avgDuration: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0
      },
      websocket: {
        connections: 0,
        messages: 0,
        rooms: 0
      }
    };

    this.startTime = Date.now();
    this.requestTimestamps = [];
    this.responseTimeSamples = [];
    
    // Start system monitoring
    this.startSystemMonitoring();
  }

  // Request metrics
  recordRequest(req, res, responseTime) {
    const now = Date.now();
    
    // Basic counters
    this.metrics.requests.total++;
    
    // Method tracking
    const method = req.method;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // Path tracking (normalize dynamic paths)
    const path = this.normalizePath(req.path);
    this.metrics.requests.byPath[path] = (this.metrics.requests.byPath[path] || 0) + 1;
    
    // Status code tracking
    const statusCode = res.statusCode;
    this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    // Response time tracking
    this.recordResponseTime(responseTime);
    
    // Throughput tracking
    this.requestTimestamps.push(now);
    this.cleanupOldTimestamps(now);
    this.updateThroughput();
  }

  recordResponseTime(responseTime) {
    const perf = this.metrics.performance.responseTime;
    
    perf.min = Math.min(perf.min, responseTime);
    perf.max = Math.max(perf.max, responseTime);
    
    // Keep last 1000 samples for percentile calculation
    this.responseTimeSamples.push(responseTime);
    if (this.responseTimeSamples.length > 1000) {
      this.responseTimeSamples.shift();
    }
    
    // Update average
    const totalSamples = this.responseTimeSamples.length;
    const sum = this.responseTimeSamples.reduce((a, b) => a + b, 0);
    perf.avg = sum / totalSamples;
    
    // Calculate percentiles
    const sorted = [...this.responseTimeSamples].sort((a, b) => a - b);
    perf.p95 = sorted[Math.floor(totalSamples * 0.95)] || 0;
    perf.p99 = sorted[Math.floor(totalSamples * 0.99)] || 0;
  }

  normalizePath(path) {
    // Replace IDs and UUIDs with placeholders
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
      .replace(/\/\d+/g, '/:id');
  }

  cleanupOldTimestamps(now) {
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  }

  updateThroughput() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    
    this.metrics.performance.throughput.requestsPerSecond = 
      this.requestTimestamps.filter(ts => ts > oneSecondAgo).length;
    
    this.metrics.performance.throughput.requestsPerMinute = 
      this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
  }

  // Database metrics
  recordDatabaseQuery(duration, success = true) {
    this.metrics.database.queries.total++;
    
    if (!success) {
      this.metrics.database.queries.failed++;
    }
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.database.queries.slow++;
    }
    
    // Update average duration
    const total = this.metrics.database.queries.total;
    const currentAvg = this.metrics.database.queries.avgDuration;
    this.metrics.database.queries.avgDuration = 
      ((currentAvg * (total - 1)) + duration) / total;
  }

  updateDatabaseConnections(active, idle, total) {
    this.metrics.database.connections = { active, idle, total };
  }

  // Cache metrics
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  updateCacheSize(size) {
    this.metrics.cache.size = size;
  }

  // WebSocket metrics
  recordWebSocketConnection(count) {
    this.metrics.websocket.connections = count;
  }

  recordWebSocketMessage() {
    this.metrics.websocket.messages++;
  }

  updateWebSocketRooms(count) {
    this.metrics.websocket.rooms = count;
  }

  // System monitoring
  startSystemMonitoring() {
    setInterval(() => {
      this.updateSystemMetrics();
    }, 5000); // Update every 5 seconds
  }

  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.system = {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        systemTotal: os.totalmem(),
        systemFree: os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      cpu: {
        usage: this.getCPUUsage(),
        loadAverage: os.loadavg()
      },
      uptime: process.uptime(),
      connections: this.metrics.requests.total // Approximate active connections
    };
  }

  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 100 - ~~(100 * totalIdle / totalTick);
  }

  // Get metrics in different formats
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    
    return `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.requests.total}

# HELP http_requests_success_total Total number of successful HTTP requests
# TYPE http_requests_success_total counter
http_requests_success_total ${metrics.requests.success}

# HELP http_requests_errors_total Total number of failed HTTP requests
# TYPE http_requests_errors_total counter
http_requests_errors_total ${metrics.requests.errors}

# HELP http_request_duration_ms HTTP request duration in milliseconds
# TYPE http_request_duration_ms histogram
http_request_duration_ms_avg ${metrics.performance.responseTime.avg}
http_request_duration_ms_min ${metrics.performance.responseTime.min === Infinity ? 0 : metrics.performance.responseTime.min}
http_request_duration_ms_max ${metrics.performance.responseTime.max}
http_request_duration_ms_p95 ${metrics.performance.responseTime.p95}
http_request_duration_ms_p99 ${metrics.performance.responseTime.p99}

# HELP http_requests_per_second Current requests per second
# TYPE http_requests_per_second gauge
http_requests_per_second ${metrics.performance.throughput.requestsPerSecond}

# HELP memory_usage_bytes Memory usage in bytes
# TYPE memory_usage_bytes gauge
memory_usage_bytes ${metrics.system.memory.used}

# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent ${metrics.system.cpu.usage}

# HELP database_queries_total Total database queries
# TYPE database_queries_total counter
database_queries_total ${metrics.database.queries.total}

# HELP database_queries_slow_total Slow database queries
# TYPE database_queries_slow_total counter
database_queries_slow_total ${metrics.database.queries.slow}

# HELP cache_hit_rate_percent Cache hit rate percentage
# TYPE cache_hit_rate_percent gauge
cache_hit_rate_percent ${metrics.cache.hitRate}

# HELP websocket_connections Active WebSocket connections
# TYPE websocket_connections gauge
websocket_connections ${metrics.websocket.connections}
`.trim();
  }

  getHealthMetrics() {
    const metrics = this.getMetrics();
    
    return {
      status: this.getOverallHealth(),
      checks: {
        memory: {
          status: metrics.system.memory.usage < 90 ? 'healthy' : 'warning',
          usage: `${metrics.system.memory.usage.toFixed(2)}%`
        },
        cpu: {
          status: metrics.system.cpu.usage < 80 ? 'healthy' : 'warning',
          usage: `${metrics.system.cpu.usage}%`
        },
        errorRate: {
          status: this.getErrorRate() < 5 ? 'healthy' : 'warning',
          rate: `${this.getErrorRate().toFixed(2)}%`
        },
        responseTime: {
          status: metrics.performance.responseTime.avg < 1000 ? 'healthy' : 'warning',
          avg: `${metrics.performance.responseTime.avg.toFixed(2)}ms`
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  getOverallHealth() {
    const metrics = this.getMetrics();
    
    if (metrics.system.memory.usage > 95 || 
        metrics.system.cpu.usage > 90 || 
        this.getErrorRate() > 10) {
      return 'unhealthy';
    }
    
    if (metrics.system.memory.usage > 80 || 
        metrics.system.cpu.usage > 70 || 
        this.getErrorRate() > 5) {
      return 'warning';
    }
    
    return 'healthy';
  }

  getErrorRate() {
    const total = this.metrics.requests.total;
    return total > 0 ? (this.metrics.requests.errors / total) * 100 : 0;
  }

  // Reset metrics (useful for testing)
  reset() {
    this.metrics.requests = {
      total: 0,
      success: 0,
      errors: 0,
      byMethod: {},
      byPath: {},
      byStatusCode: {}
    };
    
    this.metrics.performance.responseTime = {
      min: Infinity,
      max: 0,
      avg: 0,
      p95: 0,
      p99: 0,
      samples: []
    };
    
    this.requestTimestamps = [];
    this.responseTimeSamples = [];
    this.startTime = Date.now();
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

module.exports = { MetricsCollector, metricsCollector };
