/**
 * GET /api/carrier-connect/schedules
 * ====================================
 * Fetch vessel schedules between two locations.
 * Powers the trade route map and schedule selection in Pre-Calc.
 *
 * Query Parameters:
 *   origin      - UN/LOCODE (required)
 *   destination - UN/LOCODE (required)
 *   dateFrom    - Start date ISO (optional, default: today)
 *   dateTo      - End date ISO (optional, default: +4 weeks)
 *   carriers    - Comma-separated carrier codes (optional)
 */

import { getCarrierConnect } from '@/lib/carrier-connect';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');

    if (!origin || !destination) {
      return Response.json(
        { error: 'Missing required parameters: origin, destination' },
        { status: 400 }
      );
    }

    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const carriers = searchParams.get('carriers')
      ? searchParams.get('carriers').split(',').map(c => c.trim())
      : [];

    const cc = getCarrierConnect();
    const result = await cc.getSchedules({
      originUnLocationCode: origin.toUpperCase(),
      destinationUnLocationCode: destination.toUpperCase(),
      dateFrom,
      dateTo,
      carriers,
    });

    return Response.json(result);
  } catch (error) {
    console.error('[API] /carrier-connect/schedules error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}
