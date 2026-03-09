/**
 * DCSA-Standard Data Models for CarrierConnect
 * ==============================================
 * Based on DCSA (Digital Container Shipping Association) standards:
 * - Booking 2.0
 * - Track & Trace 3.0
 * - Operational Vessel Schedules (OVS)
 * - Commercial Schedules
 *
 * These models form the canonical data layer that ALL carrier adapters
 * must map to, ensuring the GTM app speaks one language regardless
 * of which carrier is behind the data.
 *
 * Reference: https://dcsa.org/standards
 * OpenAPI specs: https://app.swaggerhub.com/organizations/dcsaorg
 */

// ============================================================
// ENUMS (DCSA-defined value sets)
// ============================================================

export const CarrierCode = Object.freeze({
  MAERSK: 'MAEU',       // Maersk Line
  MSC: 'MSCU',          // MSC
  CMA_CGM: 'CMDU',      // CMA CGM
  HAPAG_LLOYD: 'HLCU',   // Hapag-Lloyd
  ONE: 'ONEY',          // Ocean Network Express
  COSCO: 'COSU',        // COSCO
  EVERGREEN: 'EGLV',    // Evergreen
  ZIM: 'ZIMU',          // ZIM
  YANG_MING: 'YMLU',    // Yang Ming
  HMM: 'HDMU',          // HMM
  SEALAND_ASIA: 'MCPU', // Sealand Asia (Maersk sub-brand)
  SEALAND_AMERICAS: 'SEAU',
  SEALAND_EUROPE: 'SEJJ',
});

export const ContainerSizeType = Object.freeze({
  '20DRY': '20DRY',     // 20ft standard dry
  '40DRY': '40DRY',     // 40ft standard dry
  '40HDRY': '40HDRY',   // 40ft high cube dry
  '20REEF': '20REEF',   // 20ft reefer
  '40REEF': '40REEF',   // 40ft reefer
  '40HREEF': '40HREEF', // 40ft high cube reefer
  '20OT': '20OT',       // 20ft open top
  '40OT': '40OT',       // 40ft open top
  '20FL': '20FL',       // 20ft flat rack
  '40FL': '40FL',       // 40ft flat rack
  '45HDRY': '45HDRY',   // 45ft high cube dry
});

export const ServiceMode = Object.freeze({
  CY: 'CY',   // Container Yard (port-to-port)
  SD: 'SD',   // Store Door (door delivery)
  CFS: 'CFS', // Container Freight Station
});

export const TransportMode = Object.freeze({
  VESSEL: 'VESSEL',
  RAIL: 'RAIL',
  TRUCK: 'TRUCK',
  BARGE: 'BARGE',
});

export const ShipmentEventType = Object.freeze({
  RECEIVED: 'RECE',
  LOADED: 'LOAD',
  DISCHARGED: 'DISC',
  DEPARTED: 'DEPA',
  ARRIVED: 'ARRI',
  TRANSSHIPMENT: 'TRAN',
  GATE_IN: 'GTIN',
  GATE_OUT: 'GTOT',
  STUFFED: 'STUF',
  STRIPPED: 'STRP',
});

export const BookingStatus = Object.freeze({
  RECEIVED: 'RECE',
  PENDING_UPDATE: 'PENU',
  UPDATE_RECEIVED: 'RECE',
  CONFIRMED: 'CONF',
  PENDING_AMENDMENTS: 'PENA',
  COMPLETED: 'CMPL',
  CANCELLED: 'CANC',
  REJECTED: 'REJE',
  DECLINED: 'DECL',
});

export const CurrencyCode = Object.freeze({
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CNY: 'CNY',
  SGD: 'SGD',
});

// ============================================================
// LOCATION MODEL (DCSA-standard)
// ============================================================

/**
 * DCSA Location - used across schedules, offers, tracking
 * Locations can be identified by UN/LOCODE, RKST code, or coordinates
 */
export function createLocation({
  locationName = '',
  unLocationCode = '',     // UN/LOCODE e.g. 'SGSIN', 'NLROT'
  rkstCode = '',           // Maersk-specific RKST code
  geoId = '',              // Maersk-specific geo ID
  countryCode = '',        // ISO 3166-1 alpha-2
  latitude = null,
  longitude = null,
  facilityCode = '',       // SMDG or BIC facility code
  facilityCodeListProvider = '', // 'SMDG' or 'BIC'
} = {}) {
  return {
    locationName,
    unLocationCode,
    rkstCode,
    geoId,
    countryCode,
    latitude,
    longitude,
    facilityCode,
    facilityCodeListProvider,
  };
}

// ============================================================
// VESSEL MODEL
// ============================================================

export function createVessel({
  vesselIMONumber = '',    // IMO number
  vesselName = '',
  vesselFlag = '',         // ISO 3166-1 alpha-2
  vesselCallSign = '',
  vesselOperatorCarrierCode = '',
} = {}) {
  return {
    vesselIMONumber,
    vesselName,
    vesselFlag,
    vesselCallSign,
    vesselOperatorCarrierCode,
  };
}

// ============================================================
// SCHEDULE & ROUTE MODELS (DCSA OVS / Commercial Schedules)
// ============================================================

/**
 * A single transport leg in a route
 */
export function createTransportLeg({
  legSequence = 0,
  transportMode = TransportMode.VESSEL,
  vessel = null,              // createVessel()
  voyageNumber = '',
  serviceCode = '',           // Carrier service loop code
  departureLocation = null,   // createLocation()
  arrivalLocation = null,     // createLocation()
  departureDateTime = '',     // ISO 8601
  arrivalDateTime = '',       // ISO 8601
  transitTimeDays = 0,
} = {}) {
  return {
    legSequence,
    transportMode,
    vessel,
    voyageNumber,
    serviceCode,
    departureLocation,
    arrivalLocation,
    departureDateTime,
    arrivalDateTime,
    transitTimeDays,
  };
}

/**
 * DCSA-standard schedule/route — a complete journey origin to destination
 */
export function createSchedule({
  scheduleId = '',             // Internal reference
  carrierCode = '',            // SCAC code from CarrierCode
  carrierName = '',
  origin = null,               // createLocation()
  destination = null,          // createLocation()
  departureDateTime = '',      // First departure
  arrivalDateTime = '',        // Final arrival
  totalTransitTimeDays = 0,
  numberOfTransshipments = 0,
  transportLegs = [],          // Array of createTransportLeg()
  serviceMode = { origin: ServiceMode.CY, destination: ServiceMode.CY },
} = {}) {
  return {
    scheduleId,
    carrierCode,
    carrierName,
    origin,
    destination,
    departureDateTime,
    arrivalDateTime,
    totalTransitTimeDays,
    numberOfTransshipments,
    transportLegs,
    serviceMode,
  };
}

// ============================================================
// RATE / OFFER MODELS
// ============================================================

/**
 * Individual charge line (freight, surcharge, etc.)
 */
export function createChargeLine({
  chargeType = '',            // e.g. 'FREIGHT', 'BAF', 'THC', 'ISPS'
  chargeName = '',
  currencyCode = CurrencyCode.USD,
  amount = 0,
  perUnit = 'CONTAINER',     // 'CONTAINER', 'BL', 'SHIPMENT'
  included = true,            // Whether included in total
} = {}) {
  return {
    chargeType,
    chargeName,
    currencyCode,
    amount,
    perUnit,
    included,
  };
}

/**
 * Container-level pricing
 */
export function createContainerOffer({
  containerSizeType = ContainerSizeType['40DRY'],
  quantity = 1,
  totalPrice = 0,
  currencyCode = CurrencyCode.USD,
  charges = [],              // Array of createChargeLine()
} = {}) {
  return {
    containerSizeType,
    quantity,
    totalPrice,
    currencyCode,
    charges,
  };
}

/**
 * Complete freight rate offer — the main model for Pre-Calc integration
 * Maps to Maersk Product Offers API response
 */
export function createRateOffer({
  offerId = '',
  carrierCode = '',
  carrierName = '',
  productCode = '',           // e.g. 'MaerskSpot'
  productName = '',           // e.g. 'Maersk Spot'
  origin = null,              // createLocation()
  destination = null,         // createLocation()
  departureDate = '',         // ISO 8601 date
  schedule = null,            // createSchedule()
  containers = [],            // Array of createContainerOffer()
  totalPrice = 0,
  currencyCode = CurrencyCode.USD,
  validFrom = '',             // ISO 8601
  validTo = '',               // ISO 8601
  bookingDeepLink = '',       // URL to carrier booking page
  demurrageConditions = null,
  detentionConditions = null,
  fmcRegulationApplies = false,
  rollableOptionEnabled = false,
  sourceCarrier = '',         // Which carrier adapter produced this
  fetchedAt = '',             // When we fetched this from the carrier
} = {}) {
  return {
    offerId,
    carrierCode,
    carrierName,
    productCode,
    productName,
    origin,
    destination,
    departureDate,
    schedule,
    containers,
    totalPrice,
    currencyCode,
    validFrom,
    validTo,
    bookingDeepLink,
    demurrageConditions,
    detentionConditions,
    fmcRegulationApplies,
    rollableOptionEnabled,
    sourceCarrier,
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

// ============================================================
// TRACKING EVENT MODELS (DCSA Track & Trace)
// ============================================================

/**
 * DCSA-standard shipment tracking event
 */
export function createTrackingEvent({
  eventId = '',
  eventType = '',              // ShipmentEventType value
  eventDateTime = '',          // ISO 8601
  eventDescription = '',
  transportMode = TransportMode.VESSEL,
  location = null,             // createLocation()
  vessel = null,               // createVessel()
  voyageNumber = '',
  containerNumber = '',
  carrierBookingReference = '',
  billOfLadingNumber = '',
} = {}) {
  return {
    eventId,
    eventType,
    eventDateTime,
    eventDescription,
    transportMode,
    location,
    vessel,
    voyageNumber,
    containerNumber,
    carrierBookingReference,
    billOfLadingNumber,
  };
}

/**
 * Complete tracking response for a shipment
 */
export function createTrackingResponse({
  trackingReference = '',      // Container number or BL number
  referenceType = 'CONTAINER', // 'CONTAINER' or 'BL'
  carrierCode = '',
  carrierName = '',
  status = '',                 // Latest event type
  statusDescription = '',
  origin = null,               // createLocation()
  destination = null,          // createLocation()
  estimatedArrival = '',       // ISO 8601
  events = [],                 // Array of createTrackingEvent()
  containers = [],             // Container numbers involved
  fetchedAt = '',
} = {}) {
  return {
    trackingReference,
    referenceType,
    carrierCode,
    carrierName,
    status,
    statusDescription,
    origin,
    destination,
    estimatedArrival,
    events,
    containers,
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

// ============================================================
// BOOKING REQUEST MODEL (DCSA Booking 2.0)
// ============================================================

/**
 * DCSA-standard booking request
 */
export function createBookingRequest({
  carrierBookingRequestReference = '',
  carrierCode = '',
  offerId = '',                 // Reference to a rate offer
  expectedDepartureDate = '',
  origin = null,
  destination = null,
  originServiceMode = ServiceMode.CY,
  destinationServiceMode = ServiceMode.CY,
  commodityType = '',
  commodityDescription = '',
  hsCode = '',                  // Harmonized System code
  containers = [],              // [{sizeType, quantity, weight}]
  shipper = null,               // Party details
  consignee = null,             // Party details
  isPartialLoadAllowed = false,
  isEquipmentSubstitutionAllowed = false,
  communicationChannelCode = 'AO', // API-originated
} = {}) {
  return {
    carrierBookingRequestReference,
    carrierCode,
    offerId,
    expectedDepartureDate,
    origin,
    destination,
    originServiceMode,
    destinationServiceMode,
    commodityType,
    commodityDescription,
    hsCode,
    containers,
    shipper,
    consignee,
    isPartialLoadAllowed,
    isEquipmentSubstitutionAllowed,
    communicationChannelCode,
  };
}

// ============================================================
// UNIFIED QUERY MODELS (what the GTM app sends)
// ============================================================

/**
 * Standard query for fetching rate offers across carriers
 */
export function createRateQuery({
  originUnLocationCode = '',    // UN/LOCODE e.g. 'SGSIN'
  destinationUnLocationCode = '', // UN/LOCODE e.g. 'NLROT'
  departureDate = '',           // ISO 8601 date
  containerRequirements = [],   // [{sizeType: '40DRY', quantity: 1}]
  originServiceMode = ServiceMode.CY,
  destinationServiceMode = ServiceMode.CY,
  carriers = [],                // Empty = all registered carriers
} = {}) {
  return {
    originUnLocationCode,
    destinationUnLocationCode,
    departureDate,
    containerRequirements: containerRequirements.length
      ? containerRequirements
      : [{ sizeType: '40DRY', quantity: 1 }],
    originServiceMode,
    destinationServiceMode,
    carriers,
  };
}

/**
 * Standard query for fetching schedules
 */
export function createScheduleQuery({
  originUnLocationCode = '',
  destinationUnLocationCode = '',
  dateFrom = '',                // ISO 8601 date
  dateTo = '',                  // ISO 8601 date (default: +4 weeks)
  carriers = [],
} = {}) {
  return {
    originUnLocationCode,
    destinationUnLocationCode,
    dateFrom: dateFrom || new Date().toISOString().split('T')[0],
    dateTo: dateTo || new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
    carriers,
  };
}

/**
 * Standard query for tracking
 */
export function createTrackingQuery({
  trackingReference = '',       // Container number or BL
  referenceType = 'CONTAINER',  // 'CONTAINER' or 'BL'
  carrierCode = '',             // Optional: specific carrier
} = {}) {
  return {
    trackingReference,
    referenceType,
    carrierCode,
  };
}
