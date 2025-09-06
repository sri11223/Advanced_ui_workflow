const { logger } = require('../utils/logger');

// Custom Error Classes
class BaseError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ValidationError extends BaseError {
  constructor(message, field = null, value = null) {
    super(message, 400, 'VALIDATION_ERROR', { field, value });
  }
}

class AuthenticationError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends BaseError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends BaseError {
  constructor(resource = 'Resource', id = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', { resource, id });
  }
}

class ConflictError extends BaseError {
  constructor(message, conflictingField = null) {
    super(message, 409, 'CONFLICT_ERROR', { conflictingField });
  }
}

class RateLimitError extends BaseError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

class DatabaseError extends BaseError {
  constructor(message, operation = null, table = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, table });
  }
}

class ExternalServiceError extends BaseError {
  constructor(service, message, statusCode = 502) {
    super(`External service error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

class BusinessLogicError extends BaseError {
  constructor(message, rule = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', { rule });
  }
}

// Error Handler Class
class EnterpriseErrorHandler {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.includeStackTrace = options.includeStackTrace !== false;
    this.logErrors = options.logErrors !== false;
    this.errorReporting = options.errorReporting || null;
    
    // Error tracking
    this.errorStats = {
      total: 0,
      byType: {},
      byStatusCode: {},
      recentErrors: []
    };
  }

  // Main error handling middleware
  handleError(error, req, res, next) {
    // Track error statistics
    this.trackError(error, req);

    // Log error
    if (this.logErrors) {
      this.logError(error, req);
    }

    // Report to external service if configured
    if (this.errorReporting) {
      this.reportError(error, req);
    }

    // Send response
    const errorResponse = this.formatErrorResponse(error, req);
    res.status(error.statusCode || 500).json(errorResponse);
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validation middleware
  validateRequest(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));
          
          throw new ValidationError('Validation failed', null, validationErrors);
        }
        
        req.validatedBody = value;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  // Error tracking
  trackError(error, req) {
    this.errorStats.total++;
    
    // Track by error type
    const errorType = error.constructor.name;
    this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;
    
    // Track by status code
    const statusCode = error.statusCode || 500;
    this.errorStats.byStatusCode[statusCode] = (this.errorStats.byStatusCode[statusCode] || 0) + 1;
    
    // Keep recent errors
    this.errorStats.recentErrors.push({
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      statusCode,
      path: req?.path,
      method: req?.method,
      userId: req?.user?.id,
      requestId: req?.id
    });
    
    // Keep only last 100 errors
    if (this.errorStats.recentErrors.length > 100) {
      this.errorStats.recentErrors.shift();
    }
  }

  // Error logging
  logError(error, req) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        stack: error.stack
      },
      request: {
        id: req?.id,
        method: req?.method,
        url: req?.url,
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
        userId: req?.user?.id
      },
      timestamp: new Date().toISOString()
    };

    if (error.statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.info('Error handled', logData);
    }
  }

  // Format error response
  formatErrorResponse(error, req) {
    const response = {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode || 'INTERNAL_ERROR',
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString()
      }
    };

    // Add request ID if available
    if (req?.id) {
      response.error.requestId = req.id;
    }

    // Add details for operational errors
    if (error.isOperational && error.details) {
      response.error.details = error.details;
    }

    // Add stack trace in development
    if (this.environment === 'development' && this.includeStackTrace) {
      response.error.stack = error.stack;
    }

    // Add validation errors
    if (error instanceof ValidationError && error.details) {
      response.error.validationErrors = error.details;
    }

    return response;
  }

  // Report error to external service
  async reportError(error, req) {
    try {
      if (this.errorReporting && typeof this.errorReporting.report === 'function') {
        await this.errorReporting.report(error, {
          request: {
            id: req?.id,
            method: req?.method,
            url: req?.url,
            headers: req?.headers,
            body: req?.body,
            user: req?.user
          },
          environment: this.environment,
          timestamp: new Date().toISOString()
        });
      }
    } catch (reportingError) {
      logger.error('Failed to report error', {
        originalError: error.message,
        reportingError: reportingError.message
      });
    }
  }

  // Get error statistics
  getErrorStats() {
    return {
      ...this.errorStats,
      errorRate: this.calculateErrorRate(),
      topErrors: this.getTopErrors()
    };
  }

  calculateErrorRate() {
    const recentErrors = this.errorStats.recentErrors.filter(
      error => Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    return {
      last5Minutes: recentErrors.length,
      averagePerMinute: recentErrors.length / 5
    };
  }

  getTopErrors() {
    const errorCounts = Object.entries(this.errorStats.byType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return errorCounts.map(([type, count]) => ({ type, count }));
  }

  // Health check for error handler
  getHealthStatus() {
    const recentErrorRate = this.calculateErrorRate();
    const criticalErrors = this.errorStats.recentErrors.filter(
      error => error.statusCode >= 500
    ).length;

    return {
      status: criticalErrors > 10 ? 'unhealthy' : 'healthy',
      errorRate: recentErrorRate,
      criticalErrors,
      totalErrors: this.errorStats.total
    };
  }

  // Reset statistics (useful for testing)
  resetStats() {
    this.errorStats = {
      total: 0,
      byType: {},
      byStatusCode: {},
      recentErrors: []
    };
  }
}

// Error factory functions
const createValidationError = (message, field, value) => new ValidationError(message, field, value);
const createAuthError = (message) => new AuthenticationError(message);
const createAuthzError = (message) => new AuthorizationError(message);
const createNotFoundError = (resource, id) => new NotFoundError(resource, id);
const createConflictError = (message, field) => new ConflictError(message, field);
const createRateLimitError = (message, retryAfter) => new RateLimitError(message, retryAfter);
const createDatabaseError = (message, operation, table) => new DatabaseError(message, operation, table);
const createExternalServiceError = (service, message, statusCode) => new ExternalServiceError(service, message, statusCode);
const createBusinessLogicError = (message, rule) => new BusinessLogicError(message, rule);

// Global unhandled error handlers
const setupGlobalErrorHandlers = (errorHandler) => {
  // Unhandled Promise Rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // Uncaught Exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

module.exports = {
  // Error classes
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  BusinessLogicError,
  
  // Error handler
  EnterpriseErrorHandler,
  
  // Factory functions
  createValidationError,
  createAuthError,
  createAuthzError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  createDatabaseError,
  createExternalServiceError,
  createBusinessLogicError,
  
  // Setup function
  setupGlobalErrorHandlers
};
