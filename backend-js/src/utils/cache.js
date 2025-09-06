const { logger } = require('./logger');

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    logger.info('Using memory cache only');
    this.startCleanupInterval();
  }

  startCleanupInterval() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiry > 0 && now > item.expiry) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async initialize() {
    logger.info('Memory cache service initialized');
  }

  async get(key) {
    try {
      const item = this.memoryCache.get(key);
      if (!item) return null;

      // Check if expired
      if (item.expiry > 0 && Date.now() > item.expiry) {
        this.memoryCache.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 0) {
    try {
      const expiry = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : 0;
      this.memoryCache.set(key, { value, expiry });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key) {
    try {
      this.memoryCache.delete(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async clear() {
    try {
      this.memoryCache.clear();
      logger.info('Memory cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async getStats() {
    return {
      memory: {
        connected: true,
        client: 'memory',
        keys: this.memoryCache.size,
        memory_usage: `${JSON.stringify([...this.memoryCache.entries()]).length} bytes`
      }
    };
  }

  async close() {
    this.memoryCache.clear();
    logger.info('Cache service closed');
  }
}

const cacheService = new CacheService();
module.exports = { cacheService };