import { NextResponse } from 'next/server'

// Built-in freight rate benchmarks (USD per 40ft container / FEU) - based on FBX/WCI Q1 2026
const LANE_RATES = {
  'asia-us_west': { ocean: 2200, transit_days: 14 },
  'asia-us_east': { ocean: 3100, transit_days: 25 },
  'asia-europe_north': { ocean: 2700, transit_days: 30 },
  'asia-europe_med': { ocean: 3800, transit_days: 22 },
  'asia-africa_east': { ocean: 1800, transit_days: 18 },
  'asia-africa_south': { ocean: 2400, transit_days: 22 },
  'asia-middle_east': { ocean: 1200, transit_days: 12 },
  'europe-us_east': { ocean: 2800, transit_days: 12 },
  'europe-africa_west': { ocean: 1600, transit_days: 14 },
  'europe-africa_south': { ocean: 2200, transit_days: 20 },
  'us-europe': { ocean: 1800, transit_days: 14 },
  'us-asia': { ocean: 800, transit_days: 16 },
  'intra-asia': { ocean: 600, transit_days: 7 },
  'intra-europe': { ocean: 500, transit_days: 5 },
}

// Region classification by coordinates
function classifyRegion(lat, lng) {
  if (lat > 10 && lat < 55 && lng > 60 && lng < 150) return 'asia'
  if (lat > 25 && lat < 72 && lng > -12 && lng < 45) return 'europe'
  if (lat > 10 && lat < 72 && lng > -170 && lng < -50) return 'us'
  if (lat > -40 && lat < 38 && lng > -20 && lng < 55) return 'africa'
  if (lat > 10 && lat < 40 && lng > 35 && lng < 65) return 'middle_east'
  if (lat > -55 && lat < 15 && lng > -90 && lng < -30) return 'south_america'
  if (lat > -50 && lat < -10 && lng > 110 && lng < 180) return 'oceania'
  return 'other'
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const originLat = parseFloat(searchParams.get('olat'))
  const originLng = parseFloat(searchParams.get('olng'))
  const destLat = parseFloat(searchParams.get('dlat'))
  const destLng = parseFloat(searchParams.get('dlng'))
  const origin = searchParams.get('origin') || 'Origin'
  const dest = searchParams.get('dest') || 'Destination'
  const mode = searchParams.get('mode') || 'ocean'

  if (isNaN(originLat) || isNaN(destLat)) {
    return NextResponse.json({ error: 'Coordinates required' }, { status: 400 })
  }

  const distance = haversine(originLat, originLng, destLat, destLng)
  const originRegion = classifyRegion(originLat, originLng)
  const destRegion = classifyRegion(destLat, destLng)

  // Find matching lane rate
  let laneKey = `${originRegion}-${destRegion}`
  let laneRate = LANE_RATES[laneKey]
  if (!laneRate) {
    laneKey = `${destRegion}-${originRegion}`
    laneRate = LANE_RATES[laneKey]
  }
  if (!laneRate && originRegion === destRegion) {
    laneRate = LANE_RATES[`intra-${originRegion}`]
  }

  // Fallback: distance-based estimate
  let oceanFreight, transitDays
  if (laneRate) {
    oceanFreight = laneRate.ocean
    transitDays = laneRate.transit_days
  } else {
    // ~$0.15-0.25 per km for ocean, with minimum
    oceanFreight = Math.max(400, Math.round(distance * 0.18))
    transitDays = Math.max(5, Math.round(distance / 600))
  }

  // Additional cost estimates
  const originInland = mode === 'ocean' ? Math.round(200 + distance * 0.01) : 0
  const destInland = mode === 'ocean' ? Math.round(250 + distance * 0.01) : 0
  const insurance = Math.round(oceanFreight * 0.015) // ~1.5% of freight
  const documentation = 150
  const thc = 350 // Terminal handling (origin + dest)
  const baf = Math.round(oceanFreight * 0.12) // Bunker adjustment ~12%

  const totalEstimate = oceanFreight + originInland + destInland + insurance + documentation + thc + baf

  return NextResponse.json({
    route: { origin, destination: dest, distance_km: Math.round(distance) },
    lane: laneKey,
    mode,
    estimates: {
      ocean_freight: oceanFreight,
      baf_surcharge: baf,
      thc_handling: thc,
      origin_inland: originInland,
      dest_inland: destInland,
      cargo_insurance: insurance,
      documentation: documentation,
      total: totalEstimate,
    },
    transit_days: transitDays,
    currency: 'USD',
    container_type: '40ft FEU',
    source: laneRate ? 'FBX/WCI benchmark Q1 2026' : 'distance-based estimate',
    disclaimer: 'Indicative rates only. Actual rates depend on carrier, season, and cargo specifics.',
  })
}
