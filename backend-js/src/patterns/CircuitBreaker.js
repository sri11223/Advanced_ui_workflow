const { logger } = require('../utils/logger');

// Circuit Breaker States
const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Circuit Breaker Implementation
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.expectedErrors = options.expectedErrors || [];
    
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.successCount = 0;
    this.requestCount = 0;
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
  }

  async execute(operation, fallback = null) {
    this.metrics.totalRequests++;
    this.requestCount++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn('Circuit breaker is OPEN, rejecting request', {
          state: this.state,
          failureCount: this.failureCount,
          nextAttempt: this.nextAttempt
        });
        
        if (fallback) {
          return await this.executeFallback(fallback);
        }
        
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      
      // Try to transition to HALF_OPEN
      this.state = CircuitState.HALF_OPEN;
      logger.info('Circuit breaker transitioning to HALF_OPEN');
    }

    const startTime = Date.now();
    
    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error, Date.now() - startTime);
      
      if (fallback) {
        return await this.executeFallback(fallback);
      }
      
      throw error;
    }
  }

  async executeWithTimeout(operation, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.metrics.totalTimeouts++;
        reject(new Error('Operation timeout'));
      }, timeout);

      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async executeFallback(fallback) {
    try {
      logger.info('Executing fallback operation');
      return await fallback();
    } catch (fallbackError) {
      logger.error('Fallback operation failed', { error: fallbackError.message });
      throw new Error('Both primary operation and fallback failed');
    }
  }

  onSuccess(responseTime) {
    this.metrics.totalSuccesses++;
    this.updateAverageResponseTime(responseTime);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // If we have enough successful requests, close the circuit
      if (this.successCount >= 3) {
        this.reset();
        logger.info('Circuit breaker CLOSED after successful recovery');
      }
    } else {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  onFailure(error, responseTime) {
    this.metrics.totalFailures++;
    this.updateAverageResponseTime(responseTime);
    
    // Check if this is an expected error that shouldn't trigger circuit breaker
    if (this.isExpectedError(error)) {
      logger.debug('Expected error, not counting towards circuit breaker', {
        error: error.message
      });
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.warn('Circuit breaker recorded failure', {
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open on failure in HALF_OPEN state
      this.trip();
    } else if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.recoveryTimeout;
    this.successCount = 0;
    
    logger.error('Circuit breaker OPENED', {
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    });
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  isExpectedError(error) {
    return this.expectedErrors.some(expectedError => {
      if (typeof expectedError === 'string') {
        return error.message.includes(expectedError);
      }
      if (expectedError instanceof RegExp) {
        return expectedError.test(error.message);
      }
      return false;
    });
  }

  updateAverageResponseTime(responseTime) {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }

  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.totalFailures / this.metrics.totalRequests) * 100 : 0,
      uptime: Date.now() - this.metrics.lastResetTime
    };
  }

  // Health check method
  isHealthy() {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN && this.successCount > 0);
  }
}

// Retry Logic with Exponential Backoff
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterEnabled = options.jitterEnabled !== false;
    this.retryableErrors = options.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
  }

  async execute(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          logger.info('Operation succeeded after retry', {
            attempt,
            context
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries || !this.isRetryableError(error)) {
          logger.error('Operation failed after all retries', {
            attempt,
            maxRetries: this.maxRetries,
            error: error.message,
            context
          });
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        
        logger.warn('Operation failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          delay,
          error: error.message,
          context
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  isRetryableError(error) {
    return this.retryableErrors.some(retryableError => {
      if (typeof retryableError === 'string') {
        return error.code === retryableError || error.message.includes(retryableError);
      }
      if (retryableError instanceof RegExp) {
        return retryableError.test(error.message);
      }
      return false;
    });
  }

  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    delay = Math.min(delay, this.maxDelay);
    
    if (this.jitterEnabled) {
      // Add jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Resilience Manager - Combines Circuit Breaker and Retry Logic
class ResilienceManager {
  constructor(options = {}) {
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker);
    this.retryHandler = new RetryHandler(options.retry);
    this.timeoutMs = options.timeout || 30000;
  }

  async execute(operation, fallback = null, context = {}) {
    const resilientOperation = async () => {
      return await this.retryHandler.execute(operation, context);
    };

    return await this.circuitBreaker.execute(resilientOperation, fallback);
  }

  getHealthStatus() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      isHealthy: this.circuitBreaker.isHealthy()
    };
  }
}

// Factory for creating resilience patterns
class ResilienceFactory {
  static createDatabaseResilience() {
    return new ResilienceManager({
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        expectedErrors: ['Connection timeout', 'Pool exhausted']
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'Pool exhausted']
      },
      timeout: 10000
    });
  }

  static createAPIResilience() {
    return new ResilienceManager({
      circuitBreaker: {
        failureThreshold: 3,
        recoveryTimeout: 60000,
        expectedErrors: ['Rate limit exceeded', '429']
      },
      retry: {
        maxRetries: 2,
        baseDelay: 2000,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '502', '503', '504']
      },
      timeout: 15000
    });
  }

  static createExternalServiceResilience() {
    return new ResilienceManager({
      circuitBreaker: {
        failureThreshold: 10,
        recoveryTimeout: 120000
      },
      retry: {
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 10000
      },
      timeout: 30000
    });
  }
}

module.exports = {
  CircuitBreaker,
  RetryHandler,
  ResilienceManager,
  ResilienceFactory,
  CircuitState
};
