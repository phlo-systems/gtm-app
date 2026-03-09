/**
 * Base Carrier Adapter
 * ====================
 * Abstract interface that all carrier-specific adapters must implement.
 * Each adapter translates between carrier-specific API formats and
 * DCSA-standard models.
 *
 * To add a new carrier:
 * 1. Create a new file (e.g., cma-cgm-adapter.js)
 * 2. Extend CarrierAdapter
 * 3. Implement all abstract methods
 * 4. Register in carrier-connect.js
 */

export class CarrierAdapterError extends Error {
  constructor(message, carrierCode, statusCode = null, details = null) {
    super(message);
    this.name = 'CarrierAdapterError';
    this.carrierCode = carrierCode;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class CarrierAdapter {
  /**
   * @param {Object} config
   * @param {string} config.carrierCode   - SCAC code (e.g., 'MAEU')
   * @param {string} config.carrierName   - Display name (e.g., 'Maersk')
   * @param {string} config.baseUrl       - API base URL
   * @param {string} config.authUrl       - OAuth token endpoint (if applicable)
   * @param {string} config.clientId      - OAuth client ID or API key
   * @param {string} config.clientSecret  - OAuth client secret
   * @param {string} config.consumerKey   - Consumer key (Maersk-specific)
   * @param {number} config.rateLimitPerMinute - Max requests per minute
   * @param {number} config.timeoutMs     - Request timeout in ms
   */
  constructor(config = {}) {
    if (new.target === CarrierAdapter) {
      throw new Error('CarrierAdapter is abstract and cannot be instantiated directly');
    }

    this.carrierCode = config.carrierCode || '';
    this.carrierName = config.carrierName || '';
    this.baseUrl = config.baseUrl || '';
    this.authUrl = config.authUrl || '';
    this.clientId = config.clientId || '';
    this.clientSecret = config.clientSecret || '';
    this.consumerKey = config.consumerKey || '';
    this.rateLimitPerMinute = config.rateLimitPerMinute || 60;
    this.timeoutMs = config.timeoutMs || 30000;

    // Token management
    this._accessToken = null;
    this._tokenExpiresAt = null;

    // Rate limiting
    this._requestTimestamps = [];

    // Health tracking
    this._healthStatus = {
      isHealthy: true,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
      totalRequests: 0,
      totalErrors: 0,
    };
  }

  // ============================================================
  // ABSTRACT METHODS - Must be implemented by each carrier adapter
  // ============================================================

  /**
   * Fetch spot rate offers for given origin/destination/date
   * @param {Object} rateQuery - createRateQuery() from dcsa-models
   * @returns {Promise<Array>} Array of createRateOffer() objects
   */
  async getOffers(rateQuery) {
    throw new Error(`${this.carrierName}: getOffers() not implemented`);
  }

  /**
   * Fetch vessel schedules between two locations
   * @param {Object} scheduleQuery - createScheduleQuery() from dcsa-models
   * @returns {Promise<Array>} Array of createSchedule() objects
   */
  async getSchedules(scheduleQuery) {
    throw new Error(`${this.carrierName}: getSchedules() not implemented`);
  }

  /**
   * Track a container or bill of lading
   * @param {Object} trackingQuery - createTrackingQuery() from dcsa-models
   * @returns {Promise<Object>} createTrackingResponse() object
   */
  async trackShipment(trackingQuery) {
    throw new Error(`${this.carrierName}: trackShipment() not implemented`);
  }

  /**
   * Create a booking based on a rate offer
   * @param {Object} bookingRequest - createBookingRequest() from dcsa-models
   * @returns {Promise<Object>} Booking confirmation
   */
  async createBooking(bookingRequest) {
    throw new Error(`${this.carrierName}: createBooking() not implemented`);
  }

  /**
   * Carrier-specific authentication flow
   * Should set this._accessToken and this._tokenExpiresAt
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    throw new Error(`${this.carrierName}: authenticate() not implemented`);
  }

  // ============================================================
  // SHARED METHODS - Used by all carrier adapters
  // ============================================================

  /**
   * Get a valid access token, refreshing if expired
   * Implements token caching at 90% lifetime (DCSA best practice)
   */
  async getAccessToken() {
    const now = Date.now();
    const bufferMs = 60000; // Refresh 60s before expiry

    if (this._accessToken && this._tokenExpiresAt && (this._tokenExpiresAt - bufferMs) > now) {
      return this._accessToken;
    }

    try {
      const token = await this.authenticate();
      this._accessToken = token;
      return token;
    } catch (error) {
      throw new CarrierAdapterError(
        `Authentication failed for ${this.carrierName}: ${error.message}`,
        this.carrierCode,
        401,
        error
      );
    }
  }

  /**
   * Make an authenticated HTTP request with rate limiting and error handling
   */
  async request(method, url, { body = null, headers = {}, params = {} } = {}) {
    // Rate limiting
    await this._enforceRateLimit();

    // Build URL with query params
    const fullUrl = this._buildUrl(url, params);

    // Get auth token
    const token = await this.getAccessToken();

    // Build request
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Add Bearer token (skip for Consumer-Key-only mode)
    if (token && token !== '__CONSUMER_KEY_ONLY__') {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Add consumer key if present (Maersk-specific — required on ALL requests)
    if (this.consumerKey) {
      requestHeaders['Consumer-Key'] = this.consumerKey;
    }

    const requestOptions = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.timeoutMs),
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestOptions.body = JSON.stringify(body);
    }

    this._healthStatus.totalRequests++;

    try {
      const response = await fetch(fullUrl, requestOptions);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new CarrierAdapterError(
          `${this.carrierName} API error: ${response.status} ${response.statusText}`,
          this.carrierCode,
          response.status,
          { url: fullUrl, responseBody: errorBody }
        );
      }

      const data = await response.json();

      // Update health
      this._healthStatus.isHealthy = true;
      this._healthStatus.lastSuccessAt = new Date().toISOString();
      this._healthStatus.consecutiveFailures = 0;

      return data;
    } catch (error) {
      // Update health
      this._healthStatus.lastFailureAt = new Date().toISOString();
      this._healthStatus.consecutiveFailures++;
      this._healthStatus.totalErrors++;

      if (this._healthStatus.consecutiveFailures >= 5) {
        this._healthStatus.isHealthy = false;
      }

      if (error instanceof CarrierAdapterError) throw error;

      throw new CarrierAdapterError(
        `${this.carrierName} request failed: ${error.message}`,
        this.carrierCode,
        null,
        { url: fullUrl, originalError: error.message }
      );
    }
  }

  /**
   * Get adapter health status
   */
  getHealth() {
    return {
      carrierCode: this.carrierCode,
      carrierName: this.carrierName,
      ...this._healthStatus,
    };
  }

  /**
   * Check if this adapter is healthy and can accept requests
   */
  isHealthy() {
    return this._healthStatus.isHealthy;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  _buildUrl(path, params = {}) {
    const base = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  async _enforceRateLimit() {
    const now = Date.now();
    const windowMs = 60000;

    // Remove timestamps older than 1 minute
    this._requestTimestamps = this._requestTimestamps.filter(
      ts => (now - ts) < windowMs
    );

    if (this._requestTimestamps.length >= this.rateLimitPerMinute) {
      const oldestInWindow = this._requestTimestamps[0];
      const waitMs = windowMs - (now - oldestInWindow) + 100;
      console.log(
        `[CarrierConnect:${this.carrierCode}] Rate limit reached, waiting ${waitMs}ms`
      );
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this._requestTimestamps.push(now);
  }
}
