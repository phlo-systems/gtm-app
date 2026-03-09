/**
 * GET /api/carrier-connect/tracking
 * ===================================
 * Track a container or bill of lading across carriers.
 *
 * Query Parameters:
 *   ref     - Container number or BL number (required)
 *   type    - 'CONTAINER' or 'BL' (optional, default: CONTAINER)
 *   carrier - Specific carrier code (optional)
 */

import { getCarrierConnect } from '@/lib/carrier-connect';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const ref = searchParams.get('ref');
    if (!ref) {
      return Response.json(
        { error: 'Missing required parameter: ref (container or BL number)' },
        { status: 400 }
      );
    }

    const type = (searchParams.get('type') || 'CONTAINER').toUpperCase();
    const carrier = searchParams.get('carrier') || '';

    const cc = getCarrierConnect();
    const result = await cc.trackShipment({
      trackingReference: ref.toUpperCase(),
      referenceType: type,
      carrierCode: carrier,
    });

    if (!result.tracking) {
      return Response.json(
        { error: 'No tracking data found for this reference' },
        { status: 404 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error('[API] /carrier-connect/tracking error:', error);
    return Response.json(
      { error: error.message || 'Failed to track shipment' },
      { status: 500 }
    );
  }
}
