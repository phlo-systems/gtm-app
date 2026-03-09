/**
 * CarrierConnect Module — Public API
 * ====================================
 * Import everything from here:
 *
 *   import { getCarrierConnect, CarrierCode } from '@/lib/carrier-connect';
 *
 *   const cc = getCarrierConnect();
 *   const offers = await cc.getOffers({
 *     originUnLocationCode: 'SGSIN',
 *     destinationUnLocationCode: 'GBFXT',
 *     departureDate: '2026-04-15',
 *   });
 */

// Gateway (main entry point)
export { getCarrierConnect, resetCarrierConnect, CarrierConnect } from './carrier-connect.js';

// DCSA Models
export {
  CarrierCode,
  ContainerSizeType,
  ServiceMode,
  TransportMode,
  ShipmentEventType,
  BookingStatus,
  CurrencyCode,
  createLocation,
  createVessel,
  createTransportLeg,
  createSchedule,
  createChargeLine,
  createContainerOffer,
  createRateOffer,
  createTrackingEvent,
  createTrackingResponse,
  createBookingRequest,
  createRateQuery,
  createScheduleQuery,
  createTrackingQuery,
} from './dcsa-models.js';

// Carrier Adapters
export { MaerskAdapter } from './maersk-adapter.js';
export { HapagLloydAdapter } from './hapag-lloyd-adapter.js';
export { CarrierAdapter, CarrierAdapterError } from './carrier-adapter.js';

// Cache
export { getRateCache, RateCache } from './rate-cache.js';
