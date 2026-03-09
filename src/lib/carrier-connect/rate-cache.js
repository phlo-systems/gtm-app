/**
 * Rate Cache
 * ==========
 * In-memory caching layer for carrier API responses.
 * Ocean freight rates change daily (not by the second), so caching
 * for 1-4 hours is safe and dramatically reduces API calls.
 *
 * Cache keys are built from query parameters to ensure exact matches.
 * TTL is configurable per data type:
 * - Rate offers: 2 hours (prices update daily)
 * - Schedules: 6 hours (schedules update weekly)
 * - Tracking: 15 minutes (events update frequently)
 */

const DEFAULT_TTL = {
  offers: 2 * 60 * 60 * 1000,     // 2 hours
  schedules: 6 * 60 * 60 * 1000,  // 6 hours
  tracking: 15 * 60 * 1000,        // 15 minutes
};

class RateCache {
  constructor(options = {}) {
    this._cache = new Map();
    this._ttl = { ...DEFAULT_TTL, ...options.ttl };
    this._maxEntries = options.maxEntries || 1000;
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };

    // Periodic cleanup every 10 minutes
    if (typeof setInterval !== 'undefined') {
      this._cleanupInterval = setInterval(() => this._cleanup(), 10 * 60 * 1000);
      // Prevent interval from keeping Node.js alive
      if (this._cleanupInterval.unref) {
        this._cleanupInterval.unref();
      }
    }
  }

  /**
   * Get cached data for a query
   * @param {string} dataType - 'offers', 'schedules', or 'tracking'
   * @param {Object} query - The query parameters
   * @returns {Object|null} Cached data or null if miss/expired
   */
  get(dataType, query) {
    const key = this._buildKey(dataType, query);
    const entry = this._cache.get(key);

    if (!entry) {
      this._stats.misses++;
      return null;
    }

    // Check TTL
    const ttl = this._ttl[dataType] || DEFAULT_TTL.offers;
    if (Date.now() - entry.timestamp > ttl) {
      this._cache.delete(key);
      this._stats.misses++;
      return null;
    }

    this._stats.hits++;
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    return {
      data: entry.data,
      cachedAt: new Date(entry.timestamp).toISOString(),
      age: Date.now() - entry.timestamp,
      ttl,
    };
  }

  /**
   * Store data in cache
   * @param {string} dataType - 'offers', 'schedules', or 'tracking'
   * @param {Object} query - The query parameters
   * @param {*} data - Data to cache
   */
  set(dataType, query, data) {
    // Enforce max entries with LRU eviction
    if (this._cache.size >= this._maxEntries) {
      this._evictLRU();
    }

    const key = this._buildKey(dataType, query);
    this._cache.set(key, {
      data,
      dataType,
      timestamp: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    });
  }

  /**
   * Invalidate cache entries
   * @param {string} dataType - Optional: specific data type to invalidate
   * @param {string} carrierCode - Optional: specific carrier to invalidate
   */
  invalidate(dataType = null, carrierCode = null) {
    if (!dataType && !carrierCode) {
      this._cache.clear();
      return;
    }

    for (const [key, entry] of this._cache) {
      const shouldInvalidate =
        (!dataType || entry.dataType === dataType) &&
        (!carrierCode || key.includes(carrierCode));

      if (shouldInvalidate) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      entries: this._cache.size,
      hitRate: total > 0 ? (this._stats.hits / total * 100).toFixed(1) + '%' : '0%',
      maxEntries: this._maxEntries,
    };
  }

  /**
   * Build a deterministic cache key from query parameters
   */
  _buildKey(dataType, query) {
    // Sort object keys for deterministic serialization
    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((acc, key) => {
        const val = query[key];
        if (val !== null && val !== undefined && val !== '') {
          acc[key] = Array.isArray(val) ? val.sort().join(',') : val;
        }
        return acc;
      }, {});

    return `${dataType}:${JSON.stringify(sortedQuery)}`;
  }

  /**
   * Remove least recently used entry
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this._cache) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey);
      this._stats.evictions++;
    }
  }

  /**
   * Remove expired entries
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._cache) {
      const ttl = this._ttl[entry.dataType] || DEFAULT_TTL.offers;
      if (now - entry.timestamp > ttl) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this._cache.clear();
  }
}

// Singleton instance for the GTM app
let _instance = null;

export function getRateCache(options = {}) {
  if (!_instance) {
    _instance = new RateCache(options);
  }
  return _instance;
}

export { RateCache };
