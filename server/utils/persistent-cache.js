const fs = require("fs").promises;
const path = require("path");

/**
 * Persistent cache implementation for storing LLM responses and other data
 * Periodically saves to disk and reloads on startup
 */
class PersistentCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), ".cache");
    this.cacheFile = options.cacheFile || "llm-cache.json";
    this.maxItems = options.maxItems || 1000;
    this.saveInterval = options.saveInterval || 5 * 60 * 1000; // 5 minutes
    this.cachePath = path.join(this.cacheDir, this.cacheFile);
    this.cache = new Map();
    this.dirty = false;
    this.lastSaveTime = Date.now();

    // Initialize the cache
    this.init();

    // Set up periodic save
    this.saveIntervalId = setInterval(
      () => this.saveIfDirty(),
      this.saveInterval
    );
  }

  /**
   * Initialize the cache - create directory if needed and load from disk
   */
  async init() {
    try {
      // Create directory if it doesn't exist
      try {
        await fs.mkdir(this.cacheDir, { recursive: true });
        console.log(`Cache directory ensured: ${this.cacheDir}`);
      } catch (dirError) {
        if (dirError.code !== "EEXIST") {
          console.warn(`Failed to create cache directory: ${dirError.message}`);
        }
      }
      // Create cache directory if it doesn't exist
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Try to load existing cache
      await this.load();

      console.log(`Persistent cache initialized with ${this.cache.size} items`);
    } catch (error) {
      console.warn(
        "Failed to initialize cache, starting with empty cache:",
        error.message
      );
    }
  }

  /**
   * Load the cache from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.cachePath, "utf8");
      const entries = JSON.parse(data);

      // Clear existing cache and load from file
      this.cache.clear();

      // Load entries, checking TTL
      const now = Date.now();
      let validCount = 0;

      entries.forEach(([key, { value, timestamp, ttl }]) => {
        // Skip expired entries
        if (ttl && now - timestamp > ttl) return;

        this.cache.set(key, { value, timestamp, ttl });
        validCount++;
      });

      console.log(
        `Loaded ${validCount} valid items from cache (${
          entries.length - validCount
        } expired items removed)`
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Error loading cache:", error);
      }
      // Start with an empty cache if file doesn't exist or is invalid
    }
  }

  /**
   * Save the cache to disk if it's dirty (has changes)
   */
  async saveIfDirty() {
    if (!this.dirty) return;

    try {
      // Prepare data for serialization
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp) // Sort by most recent
        .slice(0, this.maxItems); // Limit size

      // Save to file
      await fs.writeFile(this.cachePath, JSON.stringify(entries), "utf8");

      this.dirty = false;
      this.lastSaveTime = Date.now();
      console.log(`Cache saved with ${entries.length} items`);
    } catch (error) {
      console.error("Error saving cache:", error);
    }
  }

  /**
   * Get an item from the cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.dirty = true;
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set an item in the cache
   */
  set(key, value, ttl = null) {
    // Enforce maximum items
    if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
      // Remove oldest item
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];

      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });

    this.dirty = true;
    return this;
  }

  /**
   * Check if an item exists in the cache
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.dirty = true;
      return false;
    }

    return true;
  }

  /**
   * Delete an item from the cache
   */
  delete(key) {
    const result = this.cache.delete(key);
    if (result) this.dirty = true;
    return result;
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    this.dirty = true;
  }

  /**
   * Get the size of the cache
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Clean up resources when shutting down
   */
  async close() {
    clearInterval(this.saveIntervalId);
    await this.saveIfDirty();
  }
}

module.exports = PersistentCache;
