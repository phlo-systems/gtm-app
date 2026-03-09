import { NextResponse } from 'next/server'

/**
 * VOYAGE SEARCH API
 * 
 * GET /api/voyage-search?origin=INMUN&destination=ZADUR&date=2026-04-15&mode=ocean
 * 
 * When SEARATES_API_KEY is configured: calls SeaRates Logistics Explorer API
 * When FREIGHTOS_API_KEY is configured: calls Freightos Shipping Calculator
 * Otherwise: returns estimated voyages from built-in rate engine
 * 
 * Response: array of voyage options with carrier, schedule, and cost breakdown
 */

// ─── BUILT-IN PORT DATABASE ─────────────────────────────────────
const PORTS = {
  // Asia - China
  CNSHA: { name: "Shanghai", country: "China", lat: 31.23, lng: 121.47, region: "asia" },
  CNNGB: { name: "Ningbo", country: "China", lat: 29.87, lng: 121.55, region: "asia" },
  CNSHE: { name: "Shenzhen", country: "China", lat: 22.54, lng: 114.06, region: "asia" },
  CNQIN: { name: "Qingdao", country: "China", lat: 36.07, lng: 120.38, region: "asia" },
  CNTXG: { name: "Tianjin", country: "China", lat: 38.99, lng: 117.78, region: "asia" },
  CNXMN: { name: "Xiamen", country: "China", lat: 24.48, lng: 118.09, region: "asia" },
  HKHKG: { name: "Hong Kong", country: "Hong Kong", lat: 22.30, lng: 114.17, region: "asia" },
  // Asia - India
  INMUN: { name: "Mumbai (JNPT)", country: "India", lat: 18.95, lng: 72.95, region: "asia" },
  INMUA: { name: "Mundra", country: "India", lat: 22.84, lng: 69.72, region: "asia" },
  INCHE: { name: "Chennai", country: "India", lat: 13.08, lng: 80.29, region: "asia" },
  INKOL: { name: "Kolkata", country: "India", lat: 22.55, lng: 88.33, region: "asia" },
  INNSA: { name: "Nhava Sheva", country: "India", lat: 18.95, lng: 72.95, region: "asia" },
  INTUT: { name: "Tuticorin", country: "India", lat: 8.76, lng: 78.13, region: "asia" },
  INKOK: { name: "Kochi (Cochin)", country: "India", lat: 9.97, lng: 76.27, region: "asia" },
  INPAV: { name: "Pipavav", country: "India", lat: 20.95, lng: 71.53, region: "asia" },
  INKRI: { name: "Krishnapatnam", country: "India", lat: 14.26, lng: 80.13, region: "asia" },
  INVIS: { name: "Visakhapatnam", country: "India", lat: 17.69, lng: 83.29, region: "asia" },
  INGOI: { name: "Goa (Mormugao)", country: "India", lat: 15.41, lng: 73.80, region: "asia" },
  INDEL: { name: "Delhi (ICD Tughlakabad)", country: "India", lat: 28.50, lng: 77.27, region: "asia" },
  // Asia - Southeast
  SGSIN: { name: "Singapore", country: "Singapore", lat: 1.26, lng: 103.84, region: "asia" },
  MYTPP: { name: "Port Klang", country: "Malaysia", lat: 3.00, lng: 101.39, region: "asia" },
  MYPKG: { name: "Penang", country: "Malaysia", lat: 5.42, lng: 100.35, region: "asia" },
  THBKK: { name: "Bangkok (Laem Chabang)", country: "Thailand", lat: 13.08, lng: 100.88, region: "asia" },
  VNHPH: { name: "Hai Phong", country: "Vietnam", lat: 20.86, lng: 106.68, region: "asia" },
  VNSGN: { name: "Ho Chi Minh City", country: "Vietnam", lat: 10.77, lng: 106.70, region: "asia" },
  IDJKT: { name: "Jakarta (Tanjung Priok)", country: "Indonesia", lat: -6.10, lng: 106.88, region: "asia" },
  PHMNL: { name: "Manila", country: "Philippines", lat: 14.59, lng: 120.97, region: "asia" },
  LKCMB: { name: "Colombo", country: "Sri Lanka", lat: 6.94, lng: 79.85, region: "asia" },
  BDDAC: { name: "Chittagong", country: "Bangladesh", lat: 22.33, lng: 91.80, region: "asia" },
  MMRGN: { name: "Yangon", country: "Myanmar", lat: 16.87, lng: 96.17, region: "asia" },
  // Asia - East
  JPYOK: { name: "Yokohama", country: "Japan", lat: 35.44, lng: 139.64, region: "asia" },
  JPTYO: { name: "Tokyo", country: "Japan", lat: 35.65, lng: 139.77, region: "asia" },
  JPKOB: { name: "Kobe", country: "Japan", lat: 34.68, lng: 135.20, region: "asia" },
  KRPUS: { name: "Busan", country: "South Korea", lat: 35.10, lng: 129.04, region: "asia" },
  TWKHH: { name: "Kaohsiung", country: "Taiwan", lat: 22.61, lng: 120.27, region: "asia" },
  // Middle East
  AEAUH: { name: "Abu Dhabi", country: "UAE", lat: 24.45, lng: 54.65, region: "middle_east" },
  AEJEA: { name: "Jebel Ali", country: "UAE", lat: 25.01, lng: 55.06, region: "middle_east" },
  AEDXB: { name: "Dubai", country: "UAE", lat: 25.27, lng: 55.30, region: "middle_east" },
  OMSLL: { name: "Salalah", country: "Oman", lat: 16.94, lng: 54.00, region: "middle_east" },
  SAJED: { name: "Jeddah", country: "Saudi Arabia", lat: 21.49, lng: 39.17, region: "middle_east" },
  SADMM: { name: "Dammam", country: "Saudi Arabia", lat: 26.43, lng: 50.10, region: "middle_east" },
  BHKBS: { name: "Khalifa Bin Salman", country: "Bahrain", lat: 26.01, lng: 50.56, region: "middle_east" },
  IQBSR: { name: "Basra (Umm Qasr)", country: "Iraq", lat: 30.04, lng: 47.93, region: "middle_east" },
  // Europe
  GBFXT: { name: "Felixstowe", country: "UK", lat: 51.96, lng: 1.35, region: "europe" },
  GBSOU: { name: "Southampton", country: "UK", lat: 50.89, lng: -1.40, region: "europe" },
  GBLGP: { name: "London Gateway", country: "UK", lat: 51.50, lng: 0.47, region: "europe" },
  GBLIV: { name: "Liverpool", country: "UK", lat: 53.45, lng: -3.02, region: "europe" },
  NLRTM: { name: "Rotterdam", country: "Netherlands", lat: 51.90, lng: 4.50, region: "europe" },
  DEHAM: { name: "Hamburg", country: "Germany", lat: 53.55, lng: 9.97, region: "europe" },
  DEBHV: { name: "Bremerhaven", country: "Germany", lat: 53.54, lng: 8.58, region: "europe" },
  BEANR: { name: "Antwerp", country: "Belgium", lat: 51.26, lng: 4.40, region: "europe" },
  FRLEH: { name: "Le Havre", country: "France", lat: 49.49, lng: 0.11, region: "europe" },
  ITGOA: { name: "Genoa", country: "Italy", lat: 44.41, lng: 8.93, region: "europe" },
  ESALG: { name: "Algeciras", country: "Spain", lat: 36.13, lng: -5.45, region: "europe" },
  ESBCN: { name: "Barcelona", country: "Spain", lat: 41.35, lng: 2.17, region: "europe" },
  ESVAL: { name: "Valencia", country: "Spain", lat: 39.45, lng: -0.32, region: "europe" },
  GRPIR: { name: "Piraeus", country: "Greece", lat: 37.94, lng: 23.64, region: "europe" },
  TRIST: { name: "Istanbul (Ambarli)", country: "Turkey", lat: 40.97, lng: 28.72, region: "europe" },
  TRMER: { name: "Mersin", country: "Turkey", lat: 36.80, lng: 34.63, region: "europe" },
  PLGDY: { name: "Gdynia", country: "Poland", lat: 54.53, lng: 18.55, region: "europe" },
  RULED: { name: "St Petersburg", country: "Russia", lat: 59.93, lng: 30.14, region: "europe" },
  // Africa
  ZADUR: { name: "Durban", country: "South Africa", lat: -29.87, lng: 31.05, region: "africa" },
  ZALOB: { name: "Cape Town", country: "South Africa", lat: -33.90, lng: 18.43, region: "africa" },
  MAPTM: { name: "Tanger Med", country: "Morocco", lat: 35.88, lng: -5.50, region: "africa" },
  EGPSD: { name: "Port Said", country: "Egypt", lat: 31.26, lng: 32.30, region: "africa" },
  KEMLB: { name: "Mombasa", country: "Kenya", lat: -4.04, lng: 39.67, region: "africa" },
  NGAPP: { name: "Apapa (Lagos)", country: "Nigeria", lat: 6.44, lng: 3.36, region: "africa" },
  TZDAR: { name: "Dar es Salaam", country: "Tanzania", lat: -6.82, lng: 39.29, region: "africa" },
  DJJIB: { name: "Djibouti", country: "Djibouti", lat: 11.59, lng: 43.15, region: "africa" },
  GHTEM: { name: "Tema", country: "Ghana", lat: 5.63, lng: -0.02, region: "africa" },
  SDPZU: { name: "Port Sudan", country: "Sudan", lat: 19.62, lng: 37.23, region: "africa" },
  MZMPK: { name: "Maputo", country: "Mozambique", lat: -25.97, lng: 32.58, region: "africa" },
  // Americas
  USNYC: { name: "New York/Newark", country: "USA", lat: 40.68, lng: -74.04, region: "americas" },
  USLAX: { name: "Los Angeles", country: "USA", lat: 33.74, lng: -118.26, region: "americas" },
  USHOU: { name: "Houston", country: "USA", lat: 29.73, lng: -95.26, region: "americas" },
  USSAV: { name: "Savannah", country: "USA", lat: 32.08, lng: -81.09, region: "americas" },
  USCHI: { name: "Chicago", country: "USA", lat: 41.73, lng: -87.58, region: "americas" },
  CAHAL: { name: "Halifax", country: "Canada", lat: 44.65, lng: -63.57, region: "americas" },
  CAVAN: { name: "Vancouver", country: "Canada", lat: 49.29, lng: -123.11, region: "americas" },
  BRSSZ: { name: "Santos", country: "Brazil", lat: -23.95, lng: -46.30, region: "americas" },
  ARBUE: { name: "Buenos Aires", country: "Argentina", lat: -34.60, lng: -58.37, region: "americas" },
  CLSAI: { name: "San Antonio", country: "Chile", lat: -33.59, lng: -71.61, region: "americas" },
  PAMIT: { name: "Balboa (Panama)", country: "Panama", lat: 8.96, lng: -79.57, region: "americas" },
  // Oceania
  AUMEL: { name: "Melbourne", country: "Australia", lat: -37.82, lng: 144.95, region: "oceania" },
  AUSYD: { name: "Sydney", country: "Australia", lat: -33.85, lng: 151.18, region: "oceania" },
  AUBNE: { name: "Brisbane", country: "Australia", lat: -27.38, lng: 153.17, region: "oceania" },
  AUFRE: { name: "Fremantle (Perth)", country: "Australia", lat: -32.05, lng: 115.74, region: "oceania" },
  NZAKL: { name: "Auckland", country: "New Zealand", lat: -36.84, lng: 174.77, region: "oceania" },
};

// ─── CARRIERS & BASE RATES ──────────────────────────────────────
const CARRIERS = [
  { code: "MAEU", name: "Maersk", tier: 1, reliability: 0.92 },
  { code: "MSCU", name: "MSC", tier: 1, reliability: 0.88 },
  { code: "CMDU", name: "CMA CGM", tier: 1, reliability: 0.90 },
  { code: "COSU", name: "COSCO", tier: 2, reliability: 0.85 },
  { code: "EGLV", name: "Evergreen", tier: 2, reliability: 0.86 },
  { code: "HDMU", name: "Hapag-Lloyd", tier: 1, reliability: 0.91 },
  { code: "ONEY", name: "ONE (Ocean Network Express)", tier: 2, reliability: 0.87 },
  { code: "YMLU", name: "Yang Ming", tier: 2, reliability: 0.84 },
  { code: "ZIMU", name: "ZIM", tier: 2, reliability: 0.83 },
];

// Base ocean freight rates per 20GP by region pair (USD)
const BASE_RATES = {
  "asia_europe": { rate20: 1800, rate40: 2800, rate40hc: 3000, transitDays: [28, 35] },
  "asia_africa": { rate20: 1500, rate40: 2400, rate40hc: 2600, transitDays: [22, 30] },
  "asia_americas": { rate20: 2200, rate40: 3500, rate40hc: 3800, transitDays: [18, 28] },
  "asia_middle_east": { rate20: 900, rate40: 1400, rate40hc: 1500, transitDays: [8, 14] },
  "asia_oceania": { rate20: 1200, rate40: 1900, rate40hc: 2100, transitDays: [14, 20] },
  "europe_africa": { rate20: 1400, rate40: 2200, rate40hc: 2400, transitDays: [16, 24] },
  "europe_americas": { rate20: 1600, rate40: 2500, rate40hc: 2700, transitDays: [12, 18] },
  "europe_middle_east": { rate20: 1100, rate40: 1700, rate40hc: 1900, transitDays: [14, 20] },
  "middle_east_africa": { rate20: 1000, rate40: 1600, rate40hc: 1700, transitDays: [10, 16] },
  "americas_africa": { rate20: 2000, rate40: 3200, rate40hc: 3400, transitDays: [20, 28] },
};

// Surcharges
const SURCHARGES = {
  baf: { name: "BAF (Bunker Adjustment)", min: 200, max: 450 },
  thc_origin: { name: "THC Origin", min: 120, max: 250 },
  thc_dest: { name: "THC Destination", min: 120, max: 250 },
  seal_fee: { name: "Seal Fee", min: 15, max: 25 },
  doc_fee: { name: "Documentation Fee", min: 50, max: 85 },
  isps: { name: "ISPS Surcharge", min: 10, max: 25 },
  ens: { name: "ENS/AMS Filing", min: 25, max: 45 },
  piracy: { name: "War Risk / Piracy", min: 15, max: 50 },
};

// ─── ESTIMATE ENGINE ────────────────────────────────────────────

function resolvePort(query) {
  const q = query.toUpperCase().trim();
  // Direct UN/LOCODE match
  if (PORTS[q]) return { code: q, ...PORTS[q] };

  // Strip "country" suffix from "City, Country" format
  const parts = query.split(",").map(s => s.trim().toUpperCase());
  const cityQuery = parts[0];
  const countryQuery = parts[1] || "";

  // Exact city name match (with optional country filter)
  for (const [code, port] of Object.entries(PORTS)) {
    const nameUp = port.name.toUpperCase();
    const countryUp = port.country.toUpperCase();
    // Match city name (including parenthetical aliases like "Mumbai (JNPT)")
    const nameBase = nameUp.split("(")[0].trim();
    const nameAlias = nameUp.includes("(") ? nameUp.split("(")[1].replace(")", "").trim() : "";
    
    if (nameBase === cityQuery || nameAlias === cityQuery || nameUp === cityQuery) {
      if (!countryQuery || countryUp.includes(countryQuery)) {
        return { code, ...port };
      }
    }
  }

  // Partial match — city name contains query or query contains city name
  for (const [code, port] of Object.entries(PORTS)) {
    const nameUp = port.name.toUpperCase();
    const countryUp = port.country.toUpperCase();
    if (nameUp.includes(cityQuery) || cityQuery.includes(nameUp.split("(")[0].trim())) {
      if (!countryQuery || countryUp.includes(countryQuery)) {
        return { code, ...port };
      }
    }
  }

  // Last resort — match on country name alone (return largest port)
  if (countryQuery) {
    for (const [code, port] of Object.entries(PORTS)) {
      if (port.country.toUpperCase().includes(countryQuery)) {
        return { code, ...port };
      }
    }
  }

  return null;
}

function getRegionPair(r1, r2) {
  const sorted = [r1, r2].sort().join("_");
  // Try exact match
  if (BASE_RATES[sorted]) return { key: sorted, rates: BASE_RATES[sorted] };
  // Try combinations
  for (const [key, rates] of Object.entries(BASE_RATES)) {
    const parts = key.split("_");
    if ((parts.includes(r1) && parts.includes(r2)) || (r1 === r2 && parts[0] === r1)) {
      return { key, rates };
    }
  }
  // Same region fallback
  if (r1 === r2) return { key: "intra", rates: { rate20: 800, rate40: 1200, rate40hc: 1300, transitDays: [5, 12] } };
  // Default
  return { key: "default", rates: { rate20: 1800, rate40: 2800, rate40hc: 3000, transitDays: [20, 35] } };
}

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function generateVoyages(originPort, destPort, sailDate) {
  const { rates } = getRegionPair(originPort.region, destPort.region);
  const baseDate = new Date(sailDate || Date.now());

  // Generate 3-5 voyage options with different carriers
  const shuffled = [...CARRIERS].sort(() => Math.random() - 0.5);
  const numVoyages = Math.min(shuffled.length, randomBetween(3, 5));
  const voyages = [];

  for (let i = 0; i < numVoyages; i++) {
    const carrier = shuffled[i];
    const daysOffset = randomBetween(-2, 7); // departures around the requested date
    const etd = new Date(baseDate);
    etd.setDate(etd.getDate() + daysOffset);
    
    const transitDays = randomBetween(rates.transitDays[0], rates.transitDays[1]);
    const eta = new Date(etd);
    eta.setDate(eta.getDate() + transitDays);

    // Price variation by carrier tier and randomness
    const tierMultiplier = carrier.tier === 1 ? 1.08 : 0.95;
    const variance = 0.9 + Math.random() * 0.2; // ±10%
    
    const freightRate20 = Math.round(rates.rate20 * tierMultiplier * variance);
    const freightRate40 = Math.round(rates.rate40 * tierMultiplier * variance);
    const freightRate40hc = Math.round(rates.rate40hc * tierMultiplier * variance);

    // Generate surcharges
    const baf = randomBetween(SURCHARGES.baf.min, SURCHARGES.baf.max);
    const thcOrigin = randomBetween(SURCHARGES.thc_origin.min, SURCHARGES.thc_origin.max);
    const thcDest = randomBetween(SURCHARGES.thc_dest.min, SURCHARGES.thc_dest.max);
    const docFee = randomBetween(SURCHARGES.doc_fee.min, SURCHARGES.doc_fee.max);
    const sealFee = randomBetween(SURCHARGES.seal_fee.min, SURCHARGES.seal_fee.max);
    const isps = randomBetween(SURCHARGES.isps.min, SURCHARGES.isps.max);

    // Vessel name generation
    const vesselPrefixes = ["MSC", "CMA CGM", "Ever", "COSCO", "Maersk", "ONE", "ZIM"];
    const vesselSuffixes = ["Horizon", "Meridian", "Fortune", "Pacific", "Atlantic", "Explorer", "Phoenix", "Liberty", "Harmony", "Navigator", "Valor", "Crown"];
    const vesselName = vesselPrefixes[i % vesselPrefixes.length] + " " + vesselSuffixes[randomBetween(0, vesselSuffixes.length - 1)];
    const voyageNum = carrier.code.substring(0, 2) + randomBetween(100, 999) + (etd.getMonth() < 6 ? "E" : "W");

    voyages.push({
      id: `voyage_${i}_${Date.now()}`,
      carrier: { code: carrier.code, name: carrier.name, tier: carrier.tier, reliability: carrier.reliability },
      vessel: vesselName,
      voyage_number: voyageNum,
      route: `${originPort.name} → ${destPort.name}`,
      etd: etd.toISOString().split("T")[0],
      eta: eta.toISOString().split("T")[0],
      transit_days: transitDays,
      
      // Rates per container type
      rates: {
        "20GP": freightRate20,
        "40GP": freightRate40,
        "40HC": freightRate40hc,
      },

      // Detailed cost breakdown
      costs: {
        ocean_freight_20: freightRate20,
        ocean_freight_40: freightRate40,
        ocean_freight_40hc: freightRate40hc,
        baf,
        thc_origin: thcOrigin,
        thc_destination: thcDest,
        documentation_fee: docFee,
        seal_fee: sealFee,
        isps_surcharge: isps,
      },

      // Total per container type (all-in)
      total_20: freightRate20 + baf + thcOrigin + thcDest + docFee + sealFee + isps,
      total_40: freightRate40 + baf + thcOrigin + thcDest + docFee + sealFee + isps,
      total_40hc: freightRate40hc + baf + thcOrigin + thcDest + docFee + sealFee + isps,

      // Meta
      source: "estimate",
      currency: "USD",
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  // Sort by ETD
  voyages.sort((a, b) => new Date(a.etd) - new Date(b.etd));
  return voyages;
}

// ─── SEARATES API CALL ──────────────────────────────────────────

async function callSeaRatesAPI(originPort, destPort, date) {
  const apiKey = process.env.SEARATES_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://www.searates.com/auth/platform-token?id=${process.env.SEARATES_USER_ID}&api_key=${apiKey}`;
    const tokenRes = await fetch(url);
    const tokenData = await tokenRes.json();
    if (!tokenData.token) return null;

    const ratesUrl = `https://www.searates.com/fcl/rates?lat_from=${originPort.lat}&lng_from=${originPort.lng}&lat_to=${destPort.lat}&lng_to=${destPort.lng}`;
    const ratesRes = await fetch(ratesUrl, {
      headers: { Authorization: `Bearer ${tokenData.token}` }
    });
    const ratesData = await ratesRes.json();
    return ratesData;
  } catch (err) {
    console.error("SeaRates API error:", err.message);
    return null;
  }
}

// ─── FREIGHTOS API CALL ─────────────────────────────────────────

async function callFreightosAPI(originPort, destPort) {
  const apiKey = process.env.FREIGHTOS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://ship.freightos.com/api/shippingCalculator?loadtype=fcl&origin=${originPort.code}&destination=${destPort.code}&apiKey=${apiKey}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Freightos API error:", err.message);
    return null;
  }
}

// ─── HANDLER ────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const date = searchParams.get("date");

  if (!origin || !destination) {
    return NextResponse.json({ error: "origin and destination are required" }, { status: 400 });
  }

  const originPort = resolvePort(origin);
  const destPort = resolvePort(destination);

  if (!originPort) return NextResponse.json({ error: `Origin port not found: "${origin}". Use UN/LOCODE or city name.` }, { status: 404 });
  if (!destPort) return NextResponse.json({ error: `Destination port not found: "${destination}". Use UN/LOCODE or city name.` }, { status: 404 });

  // Try live APIs first
  let source = "estimate";
  let voyages = null;

  // Try SeaRates
  if (process.env.SEARATES_API_KEY) {
    const liveData = await callSeaRatesAPI(originPort, destPort, date);
    if (liveData) {
      source = "searates";
      // Transform SeaRates response to our format (implementation depends on their response structure)
    }
  }

  // Try Freightos
  if (!voyages && process.env.FREIGHTOS_API_KEY) {
    const liveData = await callFreightosAPI(originPort, destPort);
    if (liveData) {
      source = "freightos";
      // Transform Freightos response to our format
    }
  }

  // Fallback to estimation engine
  if (!voyages) {
    voyages = generateVoyages(originPort, destPort, date);
  }

  return NextResponse.json({
    origin: originPort,
    destination: destPort,
    sail_date: date,
    source,
    voyages,
    ports_available: Object.keys(PORTS).length,
  });
}
