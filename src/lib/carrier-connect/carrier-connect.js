/**
 * CarrierConnect — Unified Carrier Gateway
 * ==========================================
 * This is the main entry point for all carrier operations.
 * The GTM app calls CarrierConnect, which:
 *
 * 1. Checks the rate cache
 * 2. Fans out requests to relevant carrier adapters in parallel
 * 3. Normalizes all responses to DCSA standard
 * 4. Caches results
 * 5. Returns unified response to the GTM app
 *
 * Usage:
 *   import { getCarrierConnect } from '@/lib/carrier-connect';
 *   const cc = getCarrierConnect();
 *   const offers = await cc.getOffers({ origin: 'SGSIN', destination: 'NLROT', ... });
 */

import { MaerskAdapter } from './maersk-adapter.js';
import { HapagLloydAdapter } from './hapag-lloyd-adapter.js';
import { getRateCache } from './rate-cache.js';
import { CarrierCode, createRateQuery, createScheduleQuery, createTrackingQuery } from './dcsa-models.js';

// ============================================================
// CARRIER REGISTRY
// ============================================================

/**
 * Registry of all supported carrier adapters.
 * To add a new carrier:
 * 1. Create the adapter class (e.g., CmaCgmAdapter)
 * 2. Add it to this factory function
 * 3. Add env vars for the new carrier's credentials
 */
function createCarrierAdapters(config = {}) {
  const adapters = new Map();

  // --- MAERSK ---
  // Always register Maersk (primary carrier)
  // Note: Consumer-Key IS the Client ID (same value)
  const maerskConfig = config.maersk || {};
  adapters.set(CarrierCode.MAERSK, new MaerskAdapter({
    consumerKey: maerskConfig.consumerKey || process.env.MAERSK_CONSUMER_KEY,
    clientSecret: maerskConfig.clientSecret || process.env.MAERSK_CLIENT_SECRET,
    ...maerskConfig,
  }));

  // --- CMA CGM --- (Phase 2 — uncomment when adapter is ready)
  // adapters.set(CarrierCode.CMA_CGM, new CmaCgmAdapter({
  //   clientId: process.env.CMA_CGM_CLIENT_ID,
  //   clientSecret: process.env.CMA_CGM_CLIENT_SECRET,
  // }));

  // --- HAPAG-LLOYD ---
  // Free registration at api-portal.hlag.com
  // APIs: Customer Offers v4, Commercial Schedule v3 [DCSA], Track & Trace v2 [DCSA]
  const hlConfig = config.hapagLloyd || {};
  adapters.set(CarrierCode.HAPAG_LLOYD, new HapagLloydAdapter({
    clientId: hlConfig.clientId || process.env.HAPAG_LLOYD_CLIENT_ID,
    clientSecret: hlConfig.clientSecret || process.env.HAPAG_LLOYD_CLIENT_SECRET,
    ...hlConfig,
  }));

  // --- MSC --- (Phase 3)
  // adapters.set(CarrierCode.MSC, new MscAdapter({ ... }));

  // --- ONE --- (Phase 3)
  // adapters.set(CarrierCode.ONE, new OneAdapter({ ... }));

  return adapters;
}

// ============================================================
// CARRIER CONNECT CLASS
// ============================================================

class CarrierConnect {
  constructor(config = {}) {
    this.adapters = createCarrierAdapters(config);
    this.cache = getRateCache(config.cache);
    this.config = {
      enableCache: config.enableCache !== false,
      parallelRequests: config.parallelRequests !== false,
      timeoutMs: config.timeoutMs || 45000, // Overall timeout
      ...config,
    };
  }

  // ============================================================
  // GET OFFERS — Multi-carrier spot rate comparison
  // ============================================================

  /**
   * Fetch rate offers from all (or specified) carriers
   * This is the primary method for the GTM Pre-Calc screen
   *
   * @param {Object} params - Rate query parameters
   * @param {string} params.originUnLocationCode - e.g. 'SGSIN'
   * @param {string} params.destinationUnLocationCode - e.g. 'NLROT'
   * @param {string} params.departureDate - ISO date
   * @param {Array} params.containerRequirements - [{sizeType, quantity}]
   * @param {Array} params.carriers - Specific carriers (empty = all)
   * @returns {Promise<Object>} { offers: [], carriers: {}, meta: {} }
   */
  async getOffers(params) {
    const query = createRateQuery(params);
    const startTime = Date.now();

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get('offers', query);
      if (cached) {
        return {
          offers: cached.data,
          meta: {
            cached: true,
            cachedAt: cached.cachedAt,
            cacheAge: cached.age,
            duration: Date.now() - startTime,
          },
        };
      }
    }

    // Determine which carriers to query
    const targetAdapters = this._getTargetAdapters(query.carriers);

    // Fan out requests to all carriers in parallel
    const results = await this._fanOut(
      targetAdapters,
      (adapter) => adapter.getOffers(query),
      'getOffers'
    );

    // Flatten all carrier offers into single array
    const allOffers = results.flatMap(r => r.data || []);

    // Sort by total price (cheapest first)
    allOffers.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));

    // Cache results
    if (this.config.enableCache && allOffers.length > 0) {
      this.cache.set('offers', query, allOffers);
    }

    return {
      offers: allOffers,
      carriers: this._buildCarrierSummary(results),
      meta: {
        cached: false,
        totalOffers: allOffers.length,
        duration: Date.now() - startTime,
        query,
      },
    };
  }

  // ============================================================
  // GET SCHEDULES — Multi-carrier schedule search
  // ============================================================

  async getSchedules(params) {
    const query = createScheduleQuery(params);
    const startTime = Date.now();

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get('schedules', query);
      if (cached) {
        return {
          schedules: cached.data,
          meta: { cached: true, cachedAt: cached.cachedAt, duration: Date.now() - startTime },
        };
      }
    }

    const targetAdapters = this._getTargetAdapters(query.carriers);

    const results = await this._fanOut(
      targetAdapters,
      (adapter) => adapter.getSchedules(query),
      'getSchedules'
    );

    const allSchedules = results.flatMap(r => r.data || []);

    // Sort by departure date
    allSchedules.sort(
      (a, b) => new Date(a.departureDateTime) - new Date(b.departureDateTime)
    );

    if (this.config.enableCache && allSchedules.length > 0) {
      this.cache.set('schedules', query, allSchedules);
    }

    return {
      schedules: allSchedules,
      carriers: this._buildCarrierSummary(results),
      meta: {
        cached: false,
        totalSchedules: allSchedules.length,
        duration: Date.now() - startTime,
        query,
      },
    };
  }

  // ============================================================
  // TRACK SHIPMENT — Single-carrier tracking
  // ============================================================

  async trackShipment(params) {
    const query = createTrackingQuery(params);
    const startTime = Date.now();

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get('tracking', query);
      if (cached) {
        return {
          tracking: cached.data,
          meta: { cached: true, cachedAt: cached.cachedAt, duration: Date.now() - startTime },
        };
      }
    }

    // If carrier specified, use that adapter; otherwise try all
    const targetAdapters = query.carrierCode
      ? this._getTargetAdapters([query.carrierCode])
      : this._getTargetAdapters([]);

    const results = await this._fanOut(
      targetAdapters,
      (adapter) => adapter.trackShipment(query),
      'trackShipment'
    );

    // For tracking, take the first successful result
    const successfulResult = results.find(r => r.data && !r.error);
    const tracking = successfulResult?.data || null;

    if (this.config.enableCache && tracking) {
      this.cache.set('tracking', query, tracking);
    }

    return {
      tracking,
      carriers: this._buildCarrierSummary(results),
      meta: {
        cached: false,
        duration: Date.now() - startTime,
        query,
      },
    };
  }

  // ============================================================
  // CREATE BOOKING — Single-carrier booking
  // ============================================================

  async createBooking(bookingRequest) {
    const { carrierCode } = bookingRequest;

    if (!carrierCode) {
      throw new Error('carrierCode is required for booking');
    }

    const adapter = this.adapters.get(carrierCode);
    if (!adapter) {
      throw new Error(`No adapter registered for carrier: ${carrierCode}`);
    }

    return adapter.createBooking(bookingRequest);
  }

  // ============================================================
  // HEALTH & ADMIN
  // ============================================================

  /**
   * Get health status of all registered carriers
   */
  getHealth() {
    const health = {};
    for (const [code, adapter] of this.adapters) {
      health[code] = adapter.getHealth();
    }
    return {
      carriers: health,
      cache: this.cache.getStats(),
      registeredCarriers: Array.from(this.adapters.keys()),
    };
  }

  /**
   * Invalidate cache (useful after booking or manual refresh)
   */
  invalidateCache(dataType = null, carrierCode = null) {
    this.cache.invalidate(dataType, carrierCode);
  }

  /**
   * Get list of registered carriers
   */
  getRegisteredCarriers() {
    return Array.from(this.adapters.entries()).map(([code, adapter]) => ({
      code,
      name: adapter.carrierName,
      healthy: adapter.isHealthy(),
    }));
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Get adapters for specified carriers (or all if empty)
   */
  _getTargetAdapters(carrierCodes = []) {
    if (carrierCodes.length === 0) {
      // Return all healthy adapters
      return Array.from(this.adapters.values()).filter(a => a.isHealthy());
    }

    return carrierCodes
      .map(code => this.adapters.get(code))
      .filter(adapter => adapter && adapter.isHealthy());
  }

  /**
   * Execute a method across multiple adapters in parallel
   * with individual error handling (one carrier failure doesn't break others)
   */
  async _fanOut(adapters, method, methodName) {
    if (adapters.length === 0) {
      return [{
        carrierCode: 'NONE',
        error: 'No carrier adapters available',
        data: [],
      }];
    }

    const promises = adapters.map(async (adapter) => {
      try {
        const data = await Promise.race([
          method(adapter),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout after ${this.config.timeoutMs}ms`)),
              this.config.timeoutMs
            )
          ),
        ]);

        return {
          carrierCode: adapter.carrierCode,
          carrierName: adapter.carrierName,
          data: Array.isArray(data) ? data : [data],
          error: null,
          duration: null,
        };
      } catch (error) {
        console.error(
          `[CarrierConnect] ${adapter.carrierName}.${methodName}() failed:`,
          error.message
        );

        return {
          carrierCode: adapter.carrierCode,
          carrierName: adapter.carrierName,
          data: [],
          error: error.message,
          duration: null,
        };
      }
    });

    if (this.config.parallelRequests) {
      return Promise.all(promises);
    } else {
      // Sequential (useful for debugging)
      const results = [];
      for (const promise of promises) {
        results.push(await promise);
      }
      return results;
    }
  }

  /**
   * Build a summary of carrier results for the response
   */
  _buildCarrierSummary(results) {
    return results.reduce((acc, r) => {
      acc[r.carrierCode] = {
        name: r.carrierName,
        resultCount: r.data?.length || 0,
        error: r.error || null,
        healthy: !r.error,
      };
      return acc;
    }, {});
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let _instance = null;

/**
 * Get the CarrierConnect singleton instance
 * Used by API routes and the GTM app
 */
export function getCarrierConnect(config = {}) {
  if (!_instance) {
    _instance = new CarrierConnect(config);
  }
  return _instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetCarrierConnect() {
  _instance = null;
}

export { CarrierConnect };
