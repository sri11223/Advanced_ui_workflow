const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

// Advanced Rate Limiting with Redis-like memory store
class AdvancedRateLimiter {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  increment(key, windowMs, maxRequests) {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    if (!this.store.has(key)) {
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime, remaining: maxRequests - 1 };
    }

    const data = this.store.get(key);
    if (now > data.resetTime) {
      // Reset window
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime, remaining: maxRequests - 1 };
    }

    data.count++;
    return { count: data.count, resetTime: data.resetTime, remaining: Math.max(0, maxRequests - data.count) };
  }
}

const rateLimiter = new AdvancedRateLimiter();

// Enterprise Security Headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Advanced Rate Limiting Middleware
const createRateLimit = (windowMs = 60000, maxRequests = 1000, message = 'Too many requests') => {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const result = rateLimiter.increment(key, windowMs, maxRequests);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (result.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        count: result.count,
        limit: maxRequests
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
};

// Request ID Middleware
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.set('X-Request-ID', req.id);
  next();
};

// Request Logging Middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length') || 0
    });

    originalEnd.apply(this, args);
  };

  next();
};

// Input Sanitization Middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Basic XSS prevention
      return value
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          } else {
            obj[key] = sanitizeValue(obj[key]);
          }
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// Request Size Limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = typeof maxSize === 'string' ? 
      parseInt(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024) : 
      maxSize;

    if (contentLength > maxBytes) {
      logger.warn('Request size exceeded', {
        requestId: req.id,
        contentLength,
        maxBytes,
        ip: req.ip
      });

      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize
      });
    }

    next();
  };
};

// Security Validation Middleware
const securityValidation = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(\.\.\/|\.\.\\)/,  // Path traversal
    /(union|select|insert|delete|drop|create|alter)/i,  // SQL injection
    /<script|javascript:|vbscript:|onload=|onerror=/i,  // XSS
    /(\$\{|#\{)/  // Template injection
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object') {
          if (checkObject(obj[key])) return true;
        } else if (checkValue(obj[key]) || checkValue(key)) {
          return true;
        }
      }
    }
    return false;
  };

  let suspicious = false;
  if (req.body && checkObject(req.body)) suspicious = true;
  if (req.query && checkObject(req.query)) suspicious = true;
  if (req.params && checkObject(req.params)) suspicious = true;
  if (checkValue(req.url)) suspicious = true;

  if (suspicious) {
    logger.warn('Suspicious request detected', {
      requestId: req.id,
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

// Response Compression
const responseCompression = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});

// Cache Control Headers
const cacheControl = (req, res, next) => {
  // Set cache headers based on route type
  if (req.path.includes('/health')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.includes('/api/auth')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.method === 'GET' && req.path.includes('/api/')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes for API responses
  } else {
    res.set('Cache-Control', 'no-cache');
  }
  
  next();
};

// CORS with Security
const secureCORS = (origins = ['http://localhost:3000', 'http://localhost:5173']) => {
  return (req, res, next) => {
    const origin = req.get('Origin');
    
    if (origins.includes(origin) || !origin) {
      res.set('Access-Control-Allow-Origin', origin || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Max-Age', '86400'); // 24 hours
    }

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };
};

module.exports = {
  securityHeaders,
  createRateLimit,
  requestId,
  requestLogger,
  sanitizeInput,
  requestSizeLimiter,
  securityValidation,
  responseCompression,
  cacheControl,
  secureCORS,
  AdvancedRateLimiter
};
