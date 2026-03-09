/**
 * Maersk Carrier Adapter
 * =======================
 * Implements the CarrierAdapter interface for Maersk APIs.
 *
 * Maersk API Catalogue (developer.maersk.com/api-catalogue):
 *
 * TWO-TIER AUTH MODEL:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ Tier 1 — Consumer-Key only (immediate access, no approval)  │
 * │  • Point-to-Point Schedules → getSchedules()                │
 * │  • Locations API                                             │
 * │  • Vessel Information                                        │
 * ├──────────────────────────────────────────────────────────────┤
 * │ Tier 2 — Consumer-Key + OAuth 2.0 (requires approval)       │
 * │  • Tracking API v2          → trackShipment()               │
 * │  • Ocean Booking [DCSA 2.0] → createBooking()               │
 * │  • Bill of Lading [DCSA]                                    │
 * │  • Ocean Invoice, D&D, Documentation Deadlines              │
 * ├──────────────────────────────────────────────────────────────┤
 * │ Note: Spot Rates/Offers are NOT in the public API catalogue │
 * │  → getOffers() uses Freightos Estimator API as fallback     │
 * │  → Or Maersk.com instant prices (requires customer account) │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Auth Details (from developer.maersk.com/support/authorisation):
 *   Token URL:  https://api.maersk.com/customer-identity/oauth/v2/access_token
 *   Method:     POST with Content-Type: application/x-www-form-urlencoded
 *   Body:       grant_type=client_credentials&client_id={ConsumerKey}&client_secret={Secret}
 *   Headers:    Consumer-Key + Cache-Control: no-cache
 *   Token TTL:  2 hours
 *   Note:       Consumer-Key IS the Client ID (same value)
 *
 * Rate Limits:
 *   Per IP:     20 non-POST requests/second, 5 POST requests/second
 *   Per Key:    Spike arrest per API Product (see docs for each API)
 *
 * Base URL: https://api.maersk.com
 * Developer Portal: https://developer.maersk.com
 *
 * Setup:
 * 1. Register at developer.maersk.com (use company email, not free email)
 * 2. Create Integration → select "Customer" or "Other"
 * 3. Select API Products → get Consumer Key (auto-generated)
 * 4. For OAuth APIs: approval granted within 10 business days
 * 5. Consumer-Key secret viewable from "Update app" screen
 * 6. Set environment variables (see .env.example)
 */

import { CarrierAdapter, CarrierAdapterError } from './carrier-adapter.js';
import {
  CarrierCode,
  ServiceMode,
  TransportMode,
  ContainerSizeType,
  ShipmentEventType,
  createLocation,
  createVessel,
  createTransportLeg,
  createSchedule,
  createChargeLine,
  createContainerOffer,
  createRateOffer,
  createTrackingEvent,
  createTrackingResponse,
} from './dcsa-models.js';

// ============================================================
// MAERSK API CONSTANTS
// ============================================================

const MAERSK_BASE_URL = 'https://api.maersk.com';
const MAERSK_AUTH_URL = 'https://api.maersk.com/customer-identity/oauth/v2/access_token';
const MAERSK_STAGE_AUTH_URL = 'https://api-stage.maersk.com/customer-identity/oauth/v2/access_token';

// Maersk SCAC code
const MAERSK_SCAC = 'MAEU';

// APIs that only need Consumer-Key (no OAuth token)
const CONSUMER_KEY_ONLY_APIS = [
  '/products/ocean-products',  // Point-to-Point Schedules
  '/locations',                // Locations API
  '/vessels',                  // Vessel Information
];

// Container size mapping: our DCSA standard → Maersk format
const CONTAINER_SIZE_MAP = {
  '20DRY': '20DRY',
  '40DRY': '40DRY',
  '40HDRY': '40HDRY',
  '20REEF': '20REEF',
  '40REEF': '40REEF',
  '40HREEF': '40HREEF',
  '20OT': '20OT',
  '40OT': '40OT',
  '20FL': '20FL',
  '40FL': '40FL',
  '45HDRY': '45HDRY',
};

// Service mode mapping: DCSA → Maersk
const SERVICE_MODE_MAP = {
  [ServiceMode.CY]: 'CY',
  [ServiceMode.SD]: 'SD',
  [ServiceMode.CFS]: 'CFS',
};

// ============================================================
// MAERSK ADAPTER CLASS
// ============================================================

export class MaerskAdapter extends CarrierAdapter {
  constructor(config = {}) {
    // Note: Consumer-Key = Client ID in Maersk's system (same value)
    const consumerKey = config.consumerKey || process.env.MAERSK_CONSUMER_KEY || '';

    super({
      carrierCode: CarrierCode.MAERSK,
      carrierName: 'Maersk',
      baseUrl: config.baseUrl || MAERSK_BASE_URL,
      authUrl: config.authUrl || MAERSK_AUTH_URL,
      clientId: consumerKey,           // Consumer-Key IS the Client ID
      clientSecret: config.clientSecret || process.env.MAERSK_CLIENT_SECRET || '',
      consumerKey: consumerKey,
      rateLimitPerMinute: config.rateLimitPerMinute || 60,  // 20/sec = 1200/min, but be conservative
      timeoutMs: config.timeoutMs || 30000,
    });
  }

  // ============================================================
  // AUTHENTICATION — OAuth 2.0 Client Credentials
  // ============================================================

  async authenticate() {
    if (!this.consumerKey) {
      throw new CarrierAdapterError(
        'Maersk Consumer-Key not configured. Set MAERSK_CONSUMER_KEY env var. '
        + 'Register at developer.maersk.com to get one.',
        this.carrierCode,
        401
      );
    }

    // For APIs that only need Consumer-Key (no OAuth), skip token fetch
    if (!this.clientSecret) {
      // Return a marker that tells request() to use Consumer-Key only
      this._accessToken = '__CONSUMER_KEY_ONLY__';
      this._tokenExpiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000); // Never expires
      return this._accessToken;
    }

    // OAuth 2.0 Client Credentials flow
    // Exact curl from developer.maersk.com/support/authorisation:
    //   POST https://api.maersk.com/customer-identity/oauth/v2/access_token
    //   Headers: Consumer-Key, Cache-Control: no-cache, Content-Type: application/x-www-form-urlencoded
    //   Body: grant_type=client_credentials&client_id={ConsumerKey}&client_secret={Secret}
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Consumer-Key': this.consumerKey,
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.consumerKey,       // Consumer-Key IS the Client ID
        client_secret: this.clientSecret,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new CarrierAdapterError(
        `Maersk OAuth failed: ${response.status}. ` +
        (response.status === 401
          ? 'Check that your Consumer-Key has been provisioned for OAuth APIs (approval takes up to 10 business days).'
          : errorText),
        this.carrierCode,
        response.status,
        errorText
      );
    }

    const data = await response.json();

    // Token lifetime is 2 hours per Maersk docs
    this._accessToken = data.access_token;
    this._tokenExpiresAt = Date.now() + ((data.expires_in || 7200) * 1000);

    return data.access_token;
  }

  // ============================================================
  // GET OFFERS — Maersk Product Offers API v2
  // ============================================================
  // Endpoint: GET /offers/v2/offers/brand/{brandScac}/departuredate/{date}
  // Docs: api.productmanagement.maersk.com/offers/docs/endpoints/productoffers.html

  async getOffers(rateQuery) {
    const {
      originUnLocationCode,
      destinationUnLocationCode,
      departureDate,
      containerRequirements,
      originServiceMode,
      destinationServiceMode,
    } = rateQuery;

    // Validate required fields
    if (!originUnLocationCode || !destinationUnLocationCode || !departureDate) {
      throw new CarrierAdapterError(
        'Origin, destination, and departure date are required for Maersk offers',
        this.carrierCode,
        400
      );
    }

    // Build Maersk container string: e.g. "1x40DRY" or "2x20DRY,1x40HDRY"
    const containersParam = containerRequirements
      .map(c => `${c.quantity || 1}x${CONTAINER_SIZE_MAP[c.sizeType] || c.sizeType}`)
      .join(',');

    // Format date as YYYY-MM-DD
    const formattedDate = departureDate.split('T')[0];

    try {
      const data = await this.request(
        'GET',
        `/offers/v2/offers/brand/${MAERSK_SCAC}/departuredate/${formattedDate}`,
        {
          params: {
            originUnLocCode: originUnLocationCode,
            destinationUnLocCode: destinationUnLocationCode,
            containers: containersParam || '1x40DRY',
            originServiceMode: SERVICE_MODE_MAP[originServiceMode] || 'CY',
            destinationServiceMode: SERVICE_MODE_MAP[destinationServiceMode] || 'CY',
          },
        }
      );

      // Transform Maersk response to DCSA-standard RateOffer[]
      return this._transformOffers(data, rateQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to fetch Maersk offers: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // GET SCHEDULES — Maersk Point-to-Point Schedules API
  // ============================================================
  // Endpoint: GET /products/ocean-products
  // Auth: Consumer-Key only (no OAuth needed)
  // Docs: developer.maersk.com/api-catalogue → Point-to-Point Schedules
  // Required param: vesselOperatorCarrierCode=MAEU

  async getSchedules(scheduleQuery) {
    const {
      originUnLocationCode,
      destinationUnLocationCode,
      dateFrom,
      dateTo,
    } = scheduleQuery;

    if (!originUnLocationCode || !destinationUnLocationCode) {
      throw new CarrierAdapterError(
        'Origin and destination are required for Maersk schedules',
        this.carrierCode,
        400
      );
    }

    try {
      const data = await this.request(
        'GET',
        '/products/ocean-products',
        {
          params: {
            collectionOriginUnLocCode: originUnLocationCode,
            deliveryDestinationUnLocCode: destinationUnLocationCode,
            vesselOperatorCarrierCode: 'MAEU',   // Required by Maersk
            startDate: dateFrom || undefined,
            dateRange: dateTo ? `P${Math.ceil((new Date(dateTo) - new Date(dateFrom || Date.now())) / 86400000)}D` : undefined,
          },
        }
      );

      return this._transformSchedules(data, scheduleQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to fetch Maersk schedules: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // TRACK SHIPMENT — Maersk Tracking API v2
  // ============================================================
  // Endpoint: GET /tracking/v2/events

  async trackShipment(trackingQuery) {
    const { trackingReference, referenceType } = trackingQuery;

    if (!trackingReference) {
      throw new CarrierAdapterError(
        'Tracking reference is required',
        this.carrierCode,
        400
      );
    }

    // Maersk tracking accepts container numbers and BL numbers
    const params = {};
    if (referenceType === 'BL') {
      params.billOfLadingNumber = trackingReference;
    } else {
      params.containerNumber = trackingReference;
    }

    try {
      const data = await this.request('GET', '/tracking/v2/events', { params });
      return this._transformTracking(data, trackingQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to track Maersk shipment: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // CREATE BOOKING — Maersk EDP Booking v2 [DCSA Booking 2.0]
  // ============================================================
  // Endpoint: POST /booking/v2/bookings
  // This endpoint follows DCSA Booking 2.0 standard

  async createBooking(bookingRequest) {
    const {
      offerId,
      expectedDepartureDate,
      origin,
      destination,
      originServiceMode,
      destinationServiceMode,
      commodityType,
      containers,
      shipper,
      consignee,
    } = bookingRequest;

    // Build DCSA Booking 2.0 compliant request body
    const dcsaBookingBody = {
      receiptTypeAtOrigin: SERVICE_MODE_MAP[originServiceMode] || 'CY',
      deliveryTypeAtDestination: SERVICE_MODE_MAP[destinationServiceMode] || 'CY',
      expectedDepartureDate: expectedDepartureDate,
      placeOfBLIssue: origin?.unLocationCode
        ? { UNLocationCode: origin.unLocationCode }
        : undefined,
      invoicePayableAt: destination?.unLocationCode
        ? { UNLocationCode: destination.unLocationCode }
        : undefined,
      commodities: [
        {
          commodityType: commodityType || 'GENERAL',
          cargoGrossWeight: containers.reduce((sum, c) => sum + (c.weight || 0), 0),
          cargoGrossWeightUnit: 'KGM',
        },
      ],
      requestedEquipments: containers.map(c => ({
        ISOEquipmentCode: this._dcsaToIsoEquipment(c.sizeType),
        units: c.quantity || 1,
      })),
      references: offerId
        ? [{ type: 'FF', value: offerId }]
        : [],
      documentParties: {
        shipper: shipper ? { party: shipper } : undefined,
        consignee: consignee ? { party: consignee } : undefined,
      },
      isPartialLoadAllowed: bookingRequest.isPartialLoadAllowed || false,
      isEquipmentSubstitutionAllowed:
        bookingRequest.isEquipmentSubstitutionAllowed || false,
      communicationChannelCode: 'AO', // API-originated
    };

    try {
      const data = await this.request('POST', '/booking/v2/bookings', {
        body: dcsaBookingBody,
      });

      return {
        carrierBookingRequestReference: data.carrierBookingRequestReference,
        bookingStatus: data.bookingStatus,
        statusDateTime: data.bookingRequestDateTime || new Date().toISOString(),
        carrierCode: this.carrierCode,
        carrierName: this.carrierName,
        rawResponse: data,
      };
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to create Maersk booking: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // RESPONSE TRANSFORMERS — Maersk format → DCSA standard
  // ============================================================

  /**
   * Transform Maersk Product Offers response to DCSA RateOffer[]
   */
  _transformOffers(maerskData, query) {
    // Maersk returns an array of offer objects (or single object)
    const offers = Array.isArray(maerskData) ? maerskData : [maerskData];
    const results = [];

    for (const offer of offers) {
      // Skip offers with no prices or unavailable
      if (offer.unavailabilityReason) continue;

      const schedulesWithPrices = offer.routeSchedulesWithPrices || [];

      for (const swp of schedulesWithPrices) {
        const routeSchedule = swp.routeScheduleFull || swp.routeSchedule || {};
        const priceData = swp.price || {};

        // Build schedule from route legs
        const legs = (routeSchedule.routeLegs || routeSchedule.legs || []).map(
          (leg, idx) => createTransportLeg({
            legSequence: idx + 1,
            transportMode: this._mapTransportMode(leg.transportMode),
            vessel: leg.vesselName
              ? createVessel({
                  vesselIMONumber: leg.vesselIMONumber || '',
                  vesselName: leg.vesselName || '',
                  vesselFlag: leg.vesselFlag || '',
                })
              : null,
            voyageNumber: leg.voyageNumber || leg.exportVoyageNumber || '',
            serviceCode: leg.serviceName || leg.serviceCode || '',
            departureLocation: createLocation({
              locationName: leg.departurePortName || leg.fromLocation?.locationName || '',
              unLocationCode: leg.departureUnLocCode || leg.fromLocation?.unLocationCode || '',
              rkstCode: leg.departureRkstCode || '',
              countryCode: leg.departureCountryCode || '',
            }),
            arrivalLocation: createLocation({
              locationName: leg.arrivalPortName || leg.toLocation?.locationName || '',
              unLocationCode: leg.arrivalUnLocCode || leg.toLocation?.unLocationCode || '',
              rkstCode: leg.arrivalRkstCode || '',
              countryCode: leg.arrivalCountryCode || '',
            }),
            departureDateTime: leg.departureDate || leg.departureDateTime || '',
            arrivalDateTime: leg.arrivalDate || leg.arrivalDateTime || '',
            transitTimeDays: leg.transitTimeDays || 0,
          })
        );

        // Build container offers with charge breakdown
        const containerOffers = (offer.containers || []).map(c => {
          const charges = this._extractCharges(priceData, c.containerSizeType);
          const totalAmount = charges.reduce((sum, ch) => sum + ch.amount, 0);

          return createContainerOffer({
            containerSizeType: c.containerSizeType || '40DRY',
            quantity: c.quantity || 1,
            totalPrice: totalAmount || priceData.totalAmount || 0,
            currencyCode: priceData.currencyCode || 'USD',
            charges,
          });
        });

        // Calculate total transit time
        const firstDep = legs[0]?.departureDateTime;
        const lastArr = legs[legs.length - 1]?.arrivalDateTime;
        const totalTransit = firstDep && lastArr
          ? Math.ceil((new Date(lastArr) - new Date(firstDep)) / 86400000)
          : routeSchedule.transitTimeDays || 0;

        const schedule = createSchedule({
          scheduleId: `MAEU-${offer.routeCode || ''}-${firstDep || ''}`,
          carrierCode: CarrierCode.MAERSK,
          carrierName: 'Maersk',
          origin: createLocation({
            locationName: offer.originDisplayName || '',
            unLocationCode: query.originUnLocationCode,
            rkstCode: offer.originRkstCode || '',
          }),
          destination: createLocation({
            locationName: offer.destinationDisplayName || '',
            unLocationCode: query.destinationUnLocationCode,
            rkstCode: offer.destinationRkstCode || '',
          }),
          departureDateTime: firstDep || '',
          arrivalDateTime: lastArr || '',
          totalTransitTimeDays: totalTransit,
          numberOfTransshipments: Math.max(0, legs.length - 1),
          transportLegs: legs,
        });

        // Build the rate offer
        const totalPrice = containerOffers.reduce(
          (sum, co) => sum + (co.totalPrice * co.quantity), 0
        );

        results.push(createRateOffer({
          offerId: `MAEU-${offer.productCode || 'SPOT'}-${offer.routeCode || ''}-${Date.now()}`,
          carrierCode: CarrierCode.MAERSK,
          carrierName: 'Maersk',
          productCode: offer.productCode || 'MaerskSpot',
          productName: offer.productName || 'Maersk Spot',
          origin: schedule.origin,
          destination: schedule.destination,
          departureDate: query.departureDate,
          schedule,
          containers: containerOffers,
          totalPrice,
          currencyCode: priceData.currencyCode || 'USD',
          validFrom: offer.offerValidFrom || '',
          validTo: offer.offerValidTo || '',
          bookingDeepLink: offer.deepLink || '',
          fmcRegulationApplies: offer.fmcRegulationApplies || false,
          rollableOptionEnabled: offer.rollableOptionEnabled || false,
          sourceCarrier: 'MAERSK',
          fetchedAt: new Date().toISOString(),
          demurrageConditions: swp.importDnDConditions?.demurrage || null,
          detentionConditions: swp.importDnDConditions?.detention || null,
        }));
      }
    }

    return results;
  }

  /**
   * Transform Maersk Schedules response to DCSA Schedule[]
   */
  _transformSchedules(maerskData, query) {
    const schedules = Array.isArray(maerskData) ? maerskData : [maerskData];
    const results = [];

    for (const sched of schedules) {
      const legs = (sched.transportLegs || sched.legs || []).map(
        (leg, idx) => createTransportLeg({
          legSequence: idx + 1,
          transportMode: this._mapTransportMode(leg.transportMode || 'VESSEL'),
          vessel: createVessel({
            vesselIMONumber: leg.vessel?.vesselIMONumber || '',
            vesselName: leg.vessel?.vesselName || leg.vesselName || '',
          }),
          voyageNumber: leg.voyageNumber || leg.exportVoyageNumber || '',
          serviceCode: leg.serviceCode || leg.serviceName || '',
          departureLocation: createLocation({
            locationName: leg.departure?.locationName || '',
            unLocationCode: leg.departure?.unLocationCode || '',
          }),
          arrivalLocation: createLocation({
            locationName: leg.arrival?.locationName || '',
            unLocationCode: leg.arrival?.unLocationCode || '',
          }),
          departureDateTime: leg.departure?.dateTime || leg.departureDate || '',
          arrivalDateTime: leg.arrival?.dateTime || leg.arrivalDate || '',
        })
      );

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];

      results.push(createSchedule({
        scheduleId: `MAEU-SCHED-${sched.vesselOperatorCarrierCode || 'MAEU'}-${Date.now()}-${results.length}`,
        carrierCode: CarrierCode.MAERSK,
        carrierName: 'Maersk',
        origin: firstLeg?.departureLocation || createLocation({
          unLocationCode: query.originUnLocationCode,
        }),
        destination: lastLeg?.arrivalLocation || createLocation({
          unLocationCode: query.destinationUnLocationCode,
        }),
        departureDateTime: firstLeg?.departureDateTime || '',
        arrivalDateTime: lastLeg?.arrivalDateTime || '',
        totalTransitTimeDays: sched.transitTimeDays || (
          firstLeg?.departureDateTime && lastLeg?.arrivalDateTime
            ? Math.ceil(
                (new Date(lastLeg.arrivalDateTime) - new Date(firstLeg.departureDateTime)) / 86400000
              )
            : 0
        ),
        numberOfTransshipments: Math.max(0, legs.length - 1),
        transportLegs: legs,
      }));
    }

    return results;
  }

  /**
   * Transform Maersk Tracking response to DCSA TrackingResponse
   */
  _transformTracking(maerskData, query) {
    const events = (maerskData.events || maerskData || []).map(evt =>
      createTrackingEvent({
        eventId: evt.eventID || evt.eventId || '',
        eventType: this._mapEventType(evt.eventType || evt.equipmentEventTypeCode || ''),
        eventDateTime: evt.eventDateTime || evt.eventCreatedDateTime || '',
        eventDescription: evt.description || evt.eventType || '',
        transportMode: this._mapTransportMode(evt.transportMode || 'VESSEL'),
        location: createLocation({
          locationName: evt.location?.locationName || evt.facilityName || '',
          unLocationCode: evt.location?.UNLocationCode || evt.UNLocationCode || '',
          countryCode: evt.location?.countryCode || '',
        }),
        vessel: evt.transportCall?.vessel
          ? createVessel({
              vesselIMONumber: evt.transportCall.vessel.vesselIMONumber || '',
              vesselName: evt.transportCall.vessel.vesselName || '',
            })
          : null,
        voyageNumber: evt.transportCall?.exportVoyageNumber || '',
        containerNumber: query.referenceType === 'CONTAINER' ? query.trackingReference : '',
        billOfLadingNumber: query.referenceType === 'BL' ? query.trackingReference : '',
      })
    );

    // Sort events by datetime (newest first)
    events.sort((a, b) => new Date(b.eventDateTime) - new Date(a.eventDateTime));

    const latestEvent = events[0];

    return createTrackingResponse({
      trackingReference: query.trackingReference,
      referenceType: query.referenceType,
      carrierCode: CarrierCode.MAERSK,
      carrierName: 'Maersk',
      status: latestEvent?.eventType || '',
      statusDescription: latestEvent?.eventDescription || '',
      estimatedArrival: maerskData.estimatedTimeOfArrival || '',
      events,
      fetchedAt: new Date().toISOString(),
    });
  }

  // ============================================================
  // MAPPING HELPERS
  // ============================================================

  /**
   * Extract individual charge lines from Maersk price structure
   */
  _extractCharges(priceData, containerType) {
    const charges = [];

    // Maersk price structure has freight, origin charges, destination charges
    const addCharge = (type, name, amount, currency) => {
      if (amount && amount > 0) {
        charges.push(createChargeLine({
          chargeType: type,
          chargeName: name,
          currencyCode: currency || priceData.currencyCode || 'USD',
          amount,
        }));
      }
    };

    // Base freight
    addCharge('FREIGHT', 'Ocean Freight', priceData.freightAmount || priceData.baseFreight);

    // Surcharges
    const surcharges = priceData.surcharges || priceData.additionalCharges || [];
    for (const sc of surcharges) {
      addCharge(
        sc.chargeCode || sc.type || 'SURCHARGE',
        sc.chargeName || sc.description || 'Surcharge',
        sc.amount || sc.rate || 0,
        sc.currencyCode
      );
    }

    // Origin charges
    if (priceData.originCharges) {
      addCharge('ORIGIN', 'Origin Charges', priceData.originCharges.totalAmount);
    }

    // Destination charges
    if (priceData.destinationCharges) {
      addCharge('DESTINATION', 'Destination Charges', priceData.destinationCharges.totalAmount);
    }

    // If no breakdown available, use total
    if (charges.length === 0 && priceData.totalAmount) {
      addCharge('ALL_IN', 'All-In Rate', priceData.totalAmount);
    }

    return charges;
  }

  /**
   * Map Maersk transport mode strings to DCSA TransportMode
   */
  _mapTransportMode(maerskMode) {
    const map = {
      'VESSEL': TransportMode.VESSEL,
      'OCEAN': TransportMode.VESSEL,
      'SEA': TransportMode.VESSEL,
      'RAIL': TransportMode.RAIL,
      'TRUCK': TransportMode.TRUCK,
      'ROAD': TransportMode.TRUCK,
      'BARGE': TransportMode.BARGE,
      'INLAND_WATER': TransportMode.BARGE,
    };
    return map[(maerskMode || '').toUpperCase()] || TransportMode.VESSEL;
  }

  /**
   * Map Maersk event types to DCSA ShipmentEventType
   */
  _mapEventType(maerskEventType) {
    const map = {
      'LOAD': ShipmentEventType.LOADED,
      'DISC': ShipmentEventType.DISCHARGED,
      'GATE_IN': ShipmentEventType.GATE_IN,
      'GTIN': ShipmentEventType.GATE_IN,
      'GATE_OUT': ShipmentEventType.GATE_OUT,
      'GTOT': ShipmentEventType.GATE_OUT,
      'DEPA': ShipmentEventType.DEPARTED,
      'DEPARTURE': ShipmentEventType.DEPARTED,
      'ARRI': ShipmentEventType.ARRIVED,
      'ARRIVAL': ShipmentEventType.ARRIVED,
      'RECE': ShipmentEventType.RECEIVED,
      'RECEIVED': ShipmentEventType.RECEIVED,
      'TRANSSHIPMENT': ShipmentEventType.TRANSSHIPMENT,
    };
    return map[(maerskEventType || '').toUpperCase()] || maerskEventType;
  }

  /**
   * Map DCSA container size types to ISO Equipment codes (for DCSA Booking 2.0)
   */
  _dcsaToIsoEquipment(sizeType) {
    const map = {
      '20DRY': '22G1',
      '40DRY': '42G1',
      '40HDRY': '45G1',
      '20REEF': '22R1',
      '40REEF': '42R1',
      '40HREEF': '45R1',
      '20OT': '22U1',
      '40OT': '42U1',
      '20FL': '22P1',
      '40FL': '42P1',
    };
    return map[sizeType] || '42G1'; // Default to 40ft standard
  }
}
