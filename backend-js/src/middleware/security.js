import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../config';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Try again later.',
      timestamp: new Date()
    });
  }
});

// Security headers middleware
export const securityHeaders = helmet({
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
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Security middleware
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.headers['content-length'];
  const maxSize = config.upload.maxFileSize;

  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn(`Request too large: ${contentLength} bytes from IP: ${req.ip}`);
    res.status(413).json({
      success: false,
      error: 'Request entity too large',
      timestamp: new Date()
    });
    return;
  }

  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value.replace(/[<>\"']/g, '').trim();
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || config.cors.origin.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-ID', 'X-Process-Time'],
};

// Security validation middleware
export const validateSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  const checkValue = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const validateObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof key === 'string' && checkValue(key)) {
          return true;
        }
        if (validateObject(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  // Check request body, query, and params for suspicious content
  if (
    (req.body && validateObject(req.body)) ||
    (req.query && validateObject(req.query)) ||
    (req.params && validateObject(req.params))
  ) {
    logger.warn(`Suspicious request detected from IP: ${req.ip}`, {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(400).json({
      success: false,
      error: 'Invalid request content',
      timestamp: new Date()
    });
    return;
  }

  next();
};
