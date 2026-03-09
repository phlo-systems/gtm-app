/**
 * GET /api/carrier-connect/health
 * =================================
 * Health check endpoint for all registered carriers.
 * Returns adapter health, cache stats, and registered carriers.
 */

import { getCarrierConnect } from '@/lib/carrier-connect';

export async function GET() {
  try {
    const cc = getCarrierConnect();
    const health = cc.getHealth();

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...health,
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
