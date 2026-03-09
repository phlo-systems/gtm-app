/**
 * GET /api/carrier-connect/offers
 * =================================
 * Fetch spot rate offers from all registered carriers.
 * This powers the GTM app's Pre-Calc → Cost Matrix auto-population.
 *
 * Query Parameters:
 *   origin       - UN/LOCODE e.g. 'SGSIN' (required)
 *   destination  - UN/LOCODE e.g. 'NLROT' (required)
 *   date         - Departure date ISO format e.g. '2026-04-15' (required)
 *   containers   - Container spec e.g. '1x40DRY' or '2x20DRY,1x40HDRY' (optional, default: 1x40DRY)
 *   originMode   - Service mode: CY, SD, CFS (optional, default: CY)
 *   destMode     - Service mode: CY, SD, CFS (optional, default: CY)
 *   carriers     - Comma-separated carrier codes e.g. 'MAEU,CMDU' (optional, default: all)
 *
 * Response:
 *   { offers: RateOffer[], carriers: {}, meta: {} }
 */

import { getCarrierConnect } from '@/lib/carrier-connect';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse required parameters
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    if (!origin || !destination || !date) {
      return Response.json(
        { error: 'Missing required parameters: origin, destination, date' },
        { status: 400 }
      );
    }

    // Parse optional containers parameter
    // Format: "1x40DRY" or "2x20DRY,1x40HDRY"
    const containersParam = searchParams.get('containers') || '1x40DRY';
    const containerRequirements = containersParam.split(',').map(spec => {
      const match = spec.trim().match(/^(\d+)x(.+)$/);
      if (!match) return { sizeType: '40DRY', quantity: 1 };
      return { quantity: parseInt(match[1]), sizeType: match[2] };
    });

    // Parse optional parameters
    const originServiceMode = searchParams.get('originMode') || 'CY';
    const destinationServiceMode = searchParams.get('destMode') || 'CY';
    const carriers = searchParams.get('carriers')
      ? searchParams.get('carriers').split(',').map(c => c.trim())
      : [];

    // Fetch offers from CarrierConnect
    const cc = getCarrierConnect();
    const result = await cc.getOffers({
      originUnLocationCode: origin.toUpperCase(),
      destinationUnLocationCode: destination.toUpperCase(),
      departureDate: date,
      containerRequirements,
      originServiceMode,
      destinationServiceMode,
      carriers,
    });

    return Response.json(result);
  } catch (error) {
    console.error('[API] /carrier-connect/offers error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch carrier offers' },
      { status: 500 }
    );
  }
}
