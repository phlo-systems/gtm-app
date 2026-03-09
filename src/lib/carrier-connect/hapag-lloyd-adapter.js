/**
 * Hapag-Lloyd Carrier Adapter
 * ============================
 * Implements the CarrierAdapter interface for Hapag-Lloyd APIs.
 *
 * API Portal: api-portal.hlag.com
 * Docs: doc.api-portal.hlag.com
 *
 * API Products (from api-portal.hlag.com/products/portfolio):
 * ┌──────────────────────────────────────────────────────────────┐
 * │ QUOTE                                                       │
 * │  • Customer Offers v4 → getOffers()                         │
 * │    Quick Quotes + Quick Quotes Spot rates                   │
 * ├──────────────────────────────────────────────────────────────┤
 * │ SCHEDULE                                                    │
 * │  • Commercial Schedule v3 [DCSA] → getSchedules()           │
 * │    End-to-end route options in pre-booking phase             │
 * │  • Operational Vessel Schedule v1 [DCSA-OVS]                │
 * ├──────────────────────────────────────────────────────────────┤
 * │ TRACK                                                       │
 * │  • Track and Trace v2 [DCSA] → trackShipment()              │
 * │    Shipment, equipment and transport events                  │
 * │  • Live Position v1 (real-time GPS, paid add-on)            │
 * │  • HL Live v4 (reefer monitoring)                           │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Auth: OAuth 2.0 Client Credentials
 * Registration: Free account at api-portal.hlag.com
 * Sandbox: Available for testing without production impact
 *
 * Setup:
 * 1. Register at api-portal.hlag.com (free)
 * 2. Create Application → get Client ID + Client Secret
 * 3. Subscribe to API Products (Customer Offers, Commercial Schedule, T&T)
 * 4. Set HAPAG_LLOYD_CLIENT_ID and HAPAG_LLOYD_CLIENT_SECRET env vars
 */

import { CarrierAdapter, CarrierAdapterError } from './carrier-adapter.js';
import {
  CarrierCode,
  ServiceMode,
  TransportMode,
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
// HAPAG-LLOYD API CONSTANTS
// ============================================================

const HL_BASE_URL = 'https://api.hlag.com';
const HL_AUTH_URL = 'https://api.hlag.com/oauth2/token';

const HL_SCAC = 'HLCU';

// Container size mapping: DCSA → Hapag-Lloyd ISO Equipment codes
const CONTAINER_ISO_MAP = {
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

// Reverse mapping for response parsing
const ISO_CONTAINER_MAP = Object.fromEntries(
  Object.entries(CONTAINER_ISO_MAP).map(([k, v]) => [v, k])
);

// ============================================================
// HAPAG-LLOYD ADAPTER CLASS
// ============================================================

export class HapagLloydAdapter extends CarrierAdapter {
  constructor(config = {}) {
    super({
      carrierCode: CarrierCode.HAPAG_LLOYD,
      carrierName: 'Hapag-Lloyd',
      baseUrl: config.baseUrl || HL_BASE_URL,
      authUrl: config.authUrl || HL_AUTH_URL,
      clientId: config.clientId || process.env.HAPAG_LLOYD_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.HAPAG_LLOYD_CLIENT_SECRET || '',
      consumerKey: '',  // HL doesn't use consumer key, just OAuth
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
      timeoutMs: config.timeoutMs || 30000,
    });
  }

  // ============================================================
  // AUTHENTICATION — OAuth 2.0 Client Credentials
  // ============================================================

  async authenticate() {
    if (!this.clientId || !this.clientSecret) {
      throw new CarrierAdapterError(
        'Hapag-Lloyd API credentials not configured. '
        + 'Register at api-portal.hlag.com, create an Application, '
        + 'then set HAPAG_LLOYD_CLIENT_ID and HAPAG_LLOYD_CLIENT_SECRET.',
        this.carrierCode,
        401
      );
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new CarrierAdapterError(
        `Hapag-Lloyd OAuth failed: ${response.status}. ${errorText}`,
        this.carrierCode,
        response.status,
        errorText
      );
    }

    const data = await response.json();
    this._accessToken = data.access_token;
    this._tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);

    return data.access_token;
  }

  // ============================================================
  // GET OFFERS — Hapag-Lloyd Customer Offers API v4
  // ============================================================
  // Quick Quotes + Quick Quotes Spot rates
  // Provides fixed-price quotations with validity period

  async getOffers(rateQuery) {
    const {
      originUnLocationCode,
      destinationUnLocationCode,
      departureDate,
      containerRequirements,
    } = rateQuery;

    if (!originUnLocationCode || !destinationUnLocationCode) {
      throw new CarrierAdapterError(
        'Origin and destination are required for Hapag-Lloyd offers',
        this.carrierCode,
        400
      );
    }

    try {
      // Build request body for Customer Offers v4
      const requestBody = {
        placeOfReceipt: { unLocationCode: originUnLocationCode },
        placeOfDelivery: { unLocationCode: destinationUnLocationCode },
        departureDate: departureDate || new Date().toISOString().split('T')[0],
        requestedEquipments: containerRequirements.map(c => ({
          isoEquipmentCode: CONTAINER_ISO_MAP[c.sizeType] || '42G1',
          units: c.quantity || 1,
        })),
      };

      const data = await this.request('POST', '/customer-offers/v4/offers', {
        body: requestBody,
      });

      return this._transformOffers(data, rateQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to fetch Hapag-Lloyd offers: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // GET SCHEDULES — Hapag-Lloyd Commercial Schedule API v3 [DCSA]
  // ============================================================
  // DCSA Commercial Schedules standard — returns end-to-end routes

  async getSchedules(scheduleQuery) {
    const {
      originUnLocationCode,
      destinationUnLocationCode,
      dateFrom,
      dateTo,
    } = scheduleQuery;

    if (!originUnLocationCode || !destinationUnLocationCode) {
      throw new CarrierAdapterError(
        'Origin and destination are required for Hapag-Lloyd schedules',
        this.carrierCode,
        400
      );
    }

    try {
      const data = await this.request(
        'GET',
        '/commercial-schedules/v3/point-to-point',
        {
          params: {
            placeOfReceiptUnLocCode: originUnLocationCode,
            placeOfDeliveryUnLocCode: destinationUnLocationCode,
            departureDateTime: dateFrom || new Date().toISOString().split('T')[0],
            arrivalDateTime: dateTo || undefined,
            carrierServiceCode: undefined,  // All services
          },
        }
      );

      return this._transformSchedules(data, scheduleQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to fetch Hapag-Lloyd schedules: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // TRACK SHIPMENT — Hapag-Lloyd Track and Trace API v2 [DCSA]
  // ============================================================
  // DCSA Track & Trace v2 standard — shipment/equipment/transport events

  async trackShipment(trackingQuery) {
    const { trackingReference, referenceType } = trackingQuery;

    if (!trackingReference) {
      throw new CarrierAdapterError(
        'Tracking reference is required',
        this.carrierCode,
        400
      );
    }

    try {
      // DCSA T&T uses /events endpoint with query filters
      const params = {};
      if (referenceType === 'BL') {
        params.transportDocumentReference = trackingReference;
      } else {
        params.equipmentReference = trackingReference;
      }

      const data = await this.request('GET', '/track-and-trace/v2/events', { params });
      return this._transformTracking(data, trackingQuery);
    } catch (error) {
      if (error instanceof CarrierAdapterError) throw error;
      throw new CarrierAdapterError(
        `Failed to track Hapag-Lloyd shipment: ${error.message}`,
        this.carrierCode,
        null,
        error
      );
    }
  }

  // ============================================================
  // CREATE BOOKING — Not yet available in HL API portal
  // ============================================================

  async createBooking(bookingRequest) {
    throw new CarrierAdapterError(
      'Hapag-Lloyd booking API is not yet available in the public API portal. '
      + 'Use the deepLink from offers to book via hapag-lloyd.com.',
      this.carrierCode,
      501
    );
  }

  // ============================================================
  // RESPONSE TRANSFORMERS — Hapag-Lloyd format → DCSA standard
  // ============================================================

  /**
   * Transform Hapag-Lloyd Customer Offers response to DCSA RateOffer[]
   */
  _transformOffers(hlData, query) {
    // HL Offers API returns an array of quote options
    const offers = Array.isArray(hlData) ? hlData
      : hlData?.offers || hlData?.quotations || [hlData];

    const results = [];

    for (const offer of offers) {
      if (!offer) continue;

      // Extract schedule/routing info
      const route = offer.route || offer.routing || {};
      const legs = (route.legs || route.transportLegs || []).map((leg, idx) =>
        createTransportLeg({
          legSequence: idx + 1,
          transportMode: this._mapTransportMode(leg.transportMode || leg.modeOfTransport),
          vessel: leg.vessel ? createVessel({
            vesselIMONumber: leg.vessel.vesselIMONumber || '',
            vesselName: leg.vessel.vesselName || leg.vesselName || '',
          }) : null,
          voyageNumber: leg.voyageNumber || leg.carrierExportVoyageNumber || '',
          serviceCode: leg.carrierServiceCode || leg.serviceName || '',
          departureLocation: createLocation({
            locationName: leg.departure?.locationName || leg.loadPort?.name || '',
            unLocationCode: leg.departure?.unLocationCode || leg.loadPort?.unLocationCode || '',
          }),
          arrivalLocation: createLocation({
            locationName: leg.arrival?.locationName || leg.dischargePort?.name || '',
            unLocationCode: leg.arrival?.unLocationCode || leg.dischargePort?.unLocationCode || '',
          }),
          departureDateTime: leg.departure?.dateTime || leg.departureDate || '',
          arrivalDateTime: leg.arrival?.dateTime || leg.arrivalDate || '',
        })
      );

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];

      const schedule = legs.length > 0 ? createSchedule({
        scheduleId: `HLCU-${offer.quotationNumber || offer.offerId || Date.now()}`,
        carrierCode: CarrierCode.HAPAG_LLOYD,
        carrierName: 'Hapag-Lloyd',
        origin: firstLeg?.departureLocation || createLocation({
          unLocationCode: query.originUnLocationCode,
        }),
        destination: lastLeg?.arrivalLocation || createLocation({
          unLocationCode: query.destinationUnLocationCode,
        }),
        departureDateTime: firstLeg?.departureDateTime || '',
        arrivalDateTime: lastLeg?.arrivalDateTime || '',
        totalTransitTimeDays: offer.transitTimeDays || route.transitTimeDays || 0,
        numberOfTransshipments: Math.max(0, legs.length - 1),
        transportLegs: legs,
      }) : null;

      // Extract price/charge breakdown
      const charges = this._extractCharges(offer);
      const containerOffers = (offer.requestedEquipments || offer.containers || [{}]).map(eq => {
        const sizeType = ISO_CONTAINER_MAP[eq.isoEquipmentCode] || eq.containerSizeType || '40DRY';
        const totalAmount = eq.totalAmount || charges.reduce((s, c) => s + c.amount, 0);

        return createContainerOffer({
          containerSizeType: sizeType,
          quantity: eq.units || eq.quantity || 1,
          totalPrice: totalAmount,
          currencyCode: offer.currencyCode || eq.currencyCode || 'USD',
          charges: charges.length > 0 ? charges : [
            createChargeLine({
              chargeType: 'ALL_IN',
              chargeName: 'All-In Rate',
              amount: totalAmount,
              currencyCode: offer.currencyCode || 'USD',
            }),
          ],
        });
      });

      const totalPrice = containerOffers.reduce(
        (sum, co) => sum + (co.totalPrice * co.quantity), 0
      );

      results.push(createRateOffer({
        offerId: `HLCU-${offer.quotationNumber || offer.offerId || Date.now()}-${results.length}`,
        carrierCode: CarrierCode.HAPAG_LLOYD,
        carrierName: 'Hapag-Lloyd',
        productCode: offer.productCode || (offer.isSpot ? 'QuickQuoteSpot' : 'QuickQuote'),
        productName: offer.isSpot ? 'Quick Quotes Spot' : 'Quick Quotes',
        origin: schedule?.origin || createLocation({ unLocationCode: query.originUnLocationCode }),
        destination: schedule?.destination || createLocation({ unLocationCode: query.destinationUnLocationCode }),
        departureDate: query.departureDate,
        schedule,
        containers: containerOffers,
        totalPrice,
        currencyCode: offer.currencyCode || 'USD',
        validFrom: offer.validFrom || offer.validityStart || '',
        validTo: offer.validTo || offer.validityEnd || '',
        bookingDeepLink: offer.bookingLink || offer.deepLink || 
          `https://www.hapag-lloyd.com/en/online-business/booking.html`,
        sourceCarrier: 'HAPAG_LLOYD',
        fetchedAt: new Date().toISOString(),
      }));
    }

    return results;
  }

  /**
   * Transform Hapag-Lloyd Commercial Schedule response to DCSA Schedule[]
   */
  _transformSchedules(hlData, query) {
    // DCSA Commercial Schedules returns an array of route options
    const schedules = Array.isArray(hlData) ? hlData
      : hlData?.schedules || hlData?.routeOptions || [hlData];

    const results = [];

    for (const sched of schedules) {
      if (!sched) continue;

      const legs = (sched.transportLegs || sched.legs || []).map((leg, idx) =>
        createTransportLeg({
          legSequence: idx + 1,
          transportMode: this._mapTransportMode(
            leg.modeOfTransport || leg.transportMode || 'VESSEL'
          ),
          vessel: createVessel({
            vesselIMONumber: leg.vessel?.vesselIMONumber || '',
            vesselName: leg.vessel?.vesselName || leg.vesselName || '',
          }),
          voyageNumber: leg.carrierExportVoyageNumber || leg.voyageNumber || '',
          serviceCode: leg.carrierServiceCode || leg.universalServiceReference || '',
          departureLocation: createLocation({
            locationName: leg.departure?.facilityName || leg.departure?.locationName || '',
            unLocationCode: leg.departure?.UNLocationCode || leg.departure?.unLocationCode || '',
          }),
          arrivalLocation: createLocation({
            locationName: leg.arrival?.facilityName || leg.arrival?.locationName || '',
            unLocationCode: leg.arrival?.UNLocationCode || leg.arrival?.unLocationCode || '',
          }),
          departureDateTime: leg.departure?.dateTime || leg.plannedDepartureDate || '',
          arrivalDateTime: leg.arrival?.dateTime || leg.plannedArrivalDate || '',
        })
      );

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];

      const transitDays = firstLeg?.departureDateTime && lastLeg?.arrivalDateTime
        ? Math.ceil(
            (new Date(lastLeg.arrivalDateTime) - new Date(firstLeg.departureDateTime)) / 86400000
          )
        : sched.transitTimeDays || 0;

      results.push(createSchedule({
        scheduleId: `HLCU-SCHED-${Date.now()}-${results.length}`,
        carrierCode: CarrierCode.HAPAG_LLOYD,
        carrierName: 'Hapag-Lloyd',
        origin: firstLeg?.departureLocation || createLocation({
          unLocationCode: query.originUnLocationCode,
        }),
        destination: lastLeg?.arrivalLocation || createLocation({
          unLocationCode: query.destinationUnLocationCode,
        }),
        departureDateTime: firstLeg?.departureDateTime || '',
        arrivalDateTime: lastLeg?.arrivalDateTime || '',
        totalTransitTimeDays: transitDays,
        numberOfTransshipments: Math.max(0, legs.length - 1),
        transportLegs: legs,
      }));
    }

    return results;
  }

  /**
   * Transform Hapag-Lloyd DCSA Track & Trace response
   */
  _transformTracking(hlData, query) {
    // DCSA T&T v2 returns an events array
    const eventsData = Array.isArray(hlData) ? hlData : hlData?.events || [];

    const events = eventsData.map(evt =>
      createTrackingEvent({
        eventId: evt.eventID || evt.eventId || '',
        eventType: this._mapEventType(
          evt.eventType || evt.equipmentEventTypeCode || evt.shipmentEventTypeCode || ''
        ),
        eventDateTime: evt.eventDateTime || evt.eventCreatedDateTime || '',
        eventDescription: evt.description || evt.eventClassifierCode || '',
        transportMode: this._mapTransportMode(
          evt.modeOfTransport || evt.transportCall?.modeOfTransport || 'VESSEL'
        ),
        location: createLocation({
          locationName: evt.eventLocation?.locationName ||
            evt.transportCall?.location?.locationName || '',
          unLocationCode: evt.eventLocation?.UNLocationCode ||
            evt.transportCall?.UNLocationCode || '',
          facilityCode: evt.eventLocation?.facilityCode ||
            evt.transportCall?.facilityCode || '',
        }),
        vessel: evt.transportCall?.vessel ? createVessel({
          vesselIMONumber: evt.transportCall.vessel.vesselIMONumber || '',
          vesselName: evt.transportCall.vessel.vesselName || '',
        }) : null,
        voyageNumber: evt.transportCall?.carrierExportVoyageNumber || '',
        containerNumber: query.referenceType === 'CONTAINER' ? query.trackingReference : '',
        billOfLadingNumber: query.referenceType === 'BL' ? query.trackingReference : '',
      })
    );

    events.sort((a, b) => new Date(b.eventDateTime) - new Date(a.eventDateTime));
    const latestEvent = events[0];

    return createTrackingResponse({
      trackingReference: query.trackingReference,
      referenceType: query.referenceType,
      carrierCode: CarrierCode.HAPAG_LLOYD,
      carrierName: 'Hapag-Lloyd',
      status: latestEvent?.eventType || '',
      statusDescription: latestEvent?.eventDescription || '',
      events,
      fetchedAt: new Date().toISOString(),
    });
  }

  // ============================================================
  // MAPPING HELPERS
  // ============================================================

  _extractCharges(offer) {
    const charges = [];
    const addCharge = (type, name, amount, currency) => {
      if (amount && amount > 0) {
        charges.push(createChargeLine({
          chargeType: type,
          chargeName: name,
          currencyCode: currency || offer.currencyCode || 'USD',
          amount,
        }));
      }
    };

    // HL charge breakdown structure
    const freightCharges = offer.freightCharges || offer.charges?.freight || [];
    const exportSurcharges = offer.exportSurcharges || offer.charges?.export || [];
    const importSurcharges = offer.importSurcharges || offer.charges?.import || [];
    const freightSurcharges = offer.freightSurcharges || offer.charges?.freightSurcharges || [];

    for (const ch of freightCharges) {
      addCharge('FREIGHT', ch.chargeName || ch.name || 'Ocean Freight', ch.amount || ch.rate);
    }
    for (const ch of exportSurcharges) {
      addCharge('EXPORT', ch.chargeName || ch.name || 'Export Surcharge', ch.amount || ch.rate);
    }
    for (const ch of importSurcharges) {
      addCharge('IMPORT', ch.chargeName || ch.name || 'Import Surcharge', ch.amount || ch.rate);
    }
    for (const ch of freightSurcharges) {
      addCharge('SURCHARGE', ch.chargeName || ch.name || 'Freight Surcharge', ch.amount || ch.rate);
    }

    // Fallback: flat total
    if (charges.length === 0 && offer.totalAmount) {
      addCharge('ALL_IN', 'All-In Rate', offer.totalAmount);
    }

    return charges;
  }

  _mapTransportMode(hlMode) {
    const map = {
      'VESSEL': TransportMode.VESSEL,
      'MARITIME': TransportMode.VESSEL,
      'SEA': TransportMode.VESSEL,
      'RAIL': TransportMode.RAIL,
      'TRUCK': TransportMode.TRUCK,
      'ROAD': TransportMode.TRUCK,
      'INLAND_WATER': TransportMode.BARGE,
      'BARGE': TransportMode.BARGE,
    };
    return map[(hlMode || '').toUpperCase()] || TransportMode.VESSEL;
  }

  _mapEventType(hlEventType) {
    const map = {
      'LOAD': ShipmentEventType.LOADED,
      'DISC': ShipmentEventType.DISCHARGED,
      'GTIN': ShipmentEventType.GATE_IN,
      'GATE-IN': ShipmentEventType.GATE_IN,
      'GTOT': ShipmentEventType.GATE_OUT,
      'GATE-OUT': ShipmentEventType.GATE_OUT,
      'DEPA': ShipmentEventType.DEPARTED,
      'ARRI': ShipmentEventType.ARRIVED,
      'RECE': ShipmentEventType.RECEIVED,
      'STUF': ShipmentEventType.STUFFED,
      'STRP': ShipmentEventType.STRIPPED,
      'TRAN': ShipmentEventType.TRANSSHIPMENT,
    };
    return map[(hlEventType || '').toUpperCase()] || hlEventType;
  }
}
