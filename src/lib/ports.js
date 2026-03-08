// Major world ports with UN/LOCODE codes
// Used for port selection in ocean freight shipments

export const WORLD_PORTS = [
  // Asia - East
  { code: 'CNSHA', name: 'Shanghai', country: 'China', lat: 31.23, lng: 121.47 },
  { code: 'CNNGB', name: 'Ningbo-Zhoushan', country: 'China', lat: 29.87, lng: 121.55 },
  { code: 'CNSZX', name: 'Shenzhen (Yantian)', country: 'China', lat: 22.57, lng: 114.27 },
  { code: 'CNGZH', name: 'Guangzhou (Nansha)', country: 'China', lat: 22.74, lng: 113.58 },
  { code: 'CNQDG', name: 'Qingdao', country: 'China', lat: 36.07, lng: 120.38 },
  { code: 'CNTXG', name: 'Tianjin (Xingang)', country: 'China', lat: 38.99, lng: 117.74 },
  { code: 'CNXMN', name: 'Xiamen', country: 'China', lat: 24.49, lng: 118.07 },
  { code: 'HKHKG', name: 'Hong Kong', country: 'Hong Kong', lat: 22.29, lng: 114.15 },
  { code: 'TWKHH', name: 'Kaohsiung', country: 'Taiwan', lat: 22.62, lng: 120.27 },
  { code: 'JPYOK', name: 'Yokohama', country: 'Japan', lat: 35.44, lng: 139.64 },
  { code: 'JPTYO', name: 'Tokyo', country: 'Japan', lat: 35.65, lng: 139.77 },
  { code: 'JPKOB', name: 'Kobe', country: 'Japan', lat: 34.69, lng: 135.20 },
  { code: 'JPNGO', name: 'Nagoya', country: 'Japan', lat: 35.08, lng: 136.88 },
  { code: 'KRPUS', name: 'Busan', country: 'South Korea', lat: 35.10, lng: 129.04 },
  // Asia - Southeast
  { code: 'SGSIN', name: 'Singapore', country: 'Singapore', lat: 1.26, lng: 103.84 },
  { code: 'MYPKG', name: 'Port Klang', country: 'Malaysia', lat: 3.00, lng: 101.39 },
  { code: 'MYTPP', name: 'Tanjung Pelepas', country: 'Malaysia', lat: 1.36, lng: 103.55 },
  { code: 'THBKK', name: 'Bangkok (Laem Chabang)', country: 'Thailand', lat: 13.08, lng: 100.88 },
  { code: 'VNHPH', name: 'Hai Phong', country: 'Vietnam', lat: 20.86, lng: 106.68 },
  { code: 'VNSGN', name: 'Ho Chi Minh City (Cat Lai)', country: 'Vietnam', lat: 10.77, lng: 106.75 },
  { code: 'IDJKT', name: 'Jakarta (Tanjung Priok)', country: 'Indonesia', lat: -6.10, lng: 106.88 },
  { code: 'PHMNN', name: 'Manila', country: 'Philippines', lat: 14.52, lng: 120.96 },
  // Asia - South
  { code: 'INNSA', name: 'Nhava Sheva (JNPT)', country: 'India', lat: 18.95, lng: 72.95 },
  { code: 'INMUN', name: 'Mundra', country: 'India', lat: 22.74, lng: 69.72 },
  { code: 'INMAA', name: 'Chennai', country: 'India', lat: 13.10, lng: 80.29 },
  { code: 'INCCU', name: 'Kolkata (Haldia)', country: 'India', lat: 22.04, lng: 88.11 },
  { code: 'LKCMB', name: 'Colombo', country: 'Sri Lanka', lat: 6.94, lng: 79.84 },
  { code: 'BDCGP', name: 'Chittagong', country: 'Bangladesh', lat: 22.33, lng: 91.80 },
  { code: 'PKKAR', name: 'Karachi', country: 'Pakistan', lat: 24.85, lng: 67.00 },
  // Middle East
  { code: 'AEJEA', name: 'Jebel Ali (Dubai)', country: 'UAE', lat: 25.00, lng: 55.06 },
  { code: 'AEAUH', name: 'Abu Dhabi (Khalifa)', country: 'UAE', lat: 24.81, lng: 54.64 },
  { code: 'SAJED', name: 'Jeddah', country: 'Saudi Arabia', lat: 21.49, lng: 39.17 },
  { code: 'SADMM', name: 'Dammam', country: 'Saudi Arabia', lat: 26.45, lng: 50.11 },
  { code: 'OMSOH', name: 'Sohar', country: 'Oman', lat: 24.37, lng: 56.74 },
  { code: 'OMMUS', name: 'Muscat', country: 'Oman', lat: 23.62, lng: 58.57 },
  { code: 'BHRUH', name: 'Bahrain', country: 'Bahrain', lat: 26.23, lng: 50.53 },
  // Europe - North
  { code: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', lat: 51.90, lng: 4.49 },
  { code: 'BEANR', name: 'Antwerp', country: 'Belgium', lat: 51.24, lng: 4.40 },
  { code: 'DEHAM', name: 'Hamburg', country: 'Germany', lat: 53.54, lng: 9.97 },
  { code: 'DEBRV', name: 'Bremerhaven', country: 'Germany', lat: 53.55, lng: 8.57 },
  { code: 'GBFXT', name: 'Felixstowe', country: 'United Kingdom', lat: 51.96, lng: 1.33 },
  { code: 'GBSOU', name: 'Southampton', country: 'United Kingdom', lat: 50.90, lng: -1.40 },
  { code: 'GBLGP', name: 'London Gateway', country: 'United Kingdom', lat: 51.50, lng: 0.47 },
  { code: 'FRLEH', name: 'Le Havre', country: 'France', lat: 49.49, lng: 0.11 },
  { code: 'SEGOT', name: 'Gothenburg', country: 'Sweden', lat: 57.70, lng: 11.94 },
  // Europe - Mediterranean
  { code: 'ESVLC', name: 'Valencia', country: 'Spain', lat: 39.44, lng: -0.32 },
  { code: 'ESALG', name: 'Algeciras', country: 'Spain', lat: 36.13, lng: -5.44 },
  { code: 'ESBCN', name: 'Barcelona', country: 'Spain', lat: 41.35, lng: 2.17 },
  { code: 'ITGOA', name: 'Genoa', country: 'Italy', lat: 44.41, lng: 8.92 },
  { code: 'ITGIT', name: 'Gioia Tauro', country: 'Italy', lat: 38.43, lng: 15.89 },
  { code: 'GRPIR', name: 'Piraeus', country: 'Greece', lat: 37.94, lng: 23.64 },
  { code: 'TRIST', name: 'Istanbul (Ambarli)', country: 'Turkey', lat: 40.96, lng: 28.72 },
  { code: 'EGPSD', name: 'Port Said', country: 'Egypt', lat: 31.26, lng: 32.30 },
  { code: 'MAPTM', name: 'Tanger Med', country: 'Morocco', lat: 35.89, lng: -5.50 },
  // Africa
  { code: 'ZADUR', name: 'Durban', country: 'South Africa', lat: -29.87, lng: 31.03 },
  { code: 'ZACPT', name: 'Cape Town', country: 'South Africa', lat: -33.92, lng: 18.43 },
  { code: 'NGAPP', name: 'Apapa (Lagos)', country: 'Nigeria', lat: 6.44, lng: 3.36 },
  { code: 'KEMBA', name: 'Mombasa', country: 'Kenya', lat: -4.04, lng: 39.67 },
  { code: 'TZDAR', name: 'Dar es Salaam', country: 'Tanzania', lat: -6.83, lng: 39.29 },
  { code: 'MUPLU', name: 'Port Louis', country: 'Mauritius', lat: -20.16, lng: 57.50 },
  { code: 'AOLAD', name: 'Luanda', country: 'Angola', lat: -8.80, lng: 13.23 },
  { code: 'NAWVB', name: 'Walvis Bay', country: 'Namibia', lat: -22.96, lng: 14.50 },
  { code: 'MZMPN', name: 'Maputo', country: 'Mozambique', lat: -25.97, lng: 32.58 },
  { code: 'DJJIB', name: 'Djibouti', country: 'Djibouti', lat: 11.59, lng: 43.14 },
  // Americas - North
  { code: 'USLAX', name: 'Los Angeles', country: 'United States', lat: 33.74, lng: -118.26 },
  { code: 'USLGB', name: 'Long Beach', country: 'United States', lat: 33.75, lng: -118.22 },
  { code: 'USNYC', name: 'New York / New Jersey', country: 'United States', lat: 40.67, lng: -74.04 },
  { code: 'USSAV', name: 'Savannah', country: 'United States', lat: 32.08, lng: -81.08 },
  { code: 'USHOU', name: 'Houston', country: 'United States', lat: 29.73, lng: -95.26 },
  { code: 'USCHA', name: 'Charleston', country: 'United States', lat: 32.79, lng: -79.93 },
  { code: 'CAHAL', name: 'Halifax', country: 'Canada', lat: 44.65, lng: -63.57 },
  { code: 'CAVAN', name: 'Vancouver', country: 'Canada', lat: 49.29, lng: -123.11 },
  { code: 'MXVER', name: 'Veracruz', country: 'Mexico', lat: 19.20, lng: -96.13 },
  { code: 'MXZLO', name: 'Manzanillo', country: 'Mexico', lat: 19.05, lng: -104.32 },
  // Americas - South
  { code: 'BRSSZ', name: 'Santos', country: 'Brazil', lat: -23.95, lng: -46.30 },
  { code: 'BRSFS', name: 'Sao Francisco do Sul', country: 'Brazil', lat: -26.24, lng: -48.63 },
  { code: 'ARBUE', name: 'Buenos Aires', country: 'Argentina', lat: -34.60, lng: -58.38 },
  { code: 'CLSAI', name: 'San Antonio', country: 'Chile', lat: -33.59, lng: -71.62 },
  { code: 'CLVAP', name: 'Valparaiso', country: 'Chile', lat: -33.04, lng: -71.63 },
  { code: 'PECLL', name: 'Callao', country: 'Peru', lat: -12.05, lng: -77.15 },
  { code: 'COBUN', name: 'Buenaventura', country: 'Colombia', lat: 3.88, lng: -77.07 },
  { code: 'PAPCN', name: 'Panama (Colon)', country: 'Panama', lat: 9.35, lng: -79.90 },
  { code: 'DOHAI', name: 'Haina', country: 'Dominican Republic', lat: 18.42, lng: -70.02 },
  // Oceania
  { code: 'AUMEL', name: 'Melbourne', country: 'Australia', lat: -37.84, lng: 144.94 },
  { code: 'AUSYD', name: 'Sydney (Botany)', country: 'Australia', lat: -33.96, lng: 151.20 },
  { code: 'AUBNE', name: 'Brisbane', country: 'Australia', lat: -27.38, lng: 153.17 },
  { code: 'NZAKL', name: 'Auckland', country: 'New Zealand', lat: -36.84, lng: 174.77 },
]

// Group ports by region for easier display
export const PORT_REGIONS = {
  'Asia - East': WORLD_PORTS.filter(p => ['China', 'Hong Kong', 'Taiwan', 'Japan', 'South Korea'].includes(p.country)),
  'Asia - Southeast': WORLD_PORTS.filter(p => ['Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines'].includes(p.country)),
  'Asia - South': WORLD_PORTS.filter(p => ['India', 'Sri Lanka', 'Bangladesh', 'Pakistan'].includes(p.country)),
  'Middle East': WORLD_PORTS.filter(p => ['UAE', 'Saudi Arabia', 'Oman', 'Bahrain'].includes(p.country)),
  'Europe - North': WORLD_PORTS.filter(p => ['Netherlands', 'Belgium', 'Germany', 'United Kingdom', 'France', 'Sweden'].includes(p.country)),
  'Europe - Med': WORLD_PORTS.filter(p => ['Spain', 'Italy', 'Greece', 'Turkey', 'Egypt', 'Morocco'].includes(p.country)),
  'Africa': WORLD_PORTS.filter(p => ['South Africa', 'Nigeria', 'Kenya', 'Tanzania', 'Mauritius', 'Angola', 'Namibia', 'Mozambique', 'Djibouti'].includes(p.country)),
  'Americas - North': WORLD_PORTS.filter(p => ['United States', 'Canada', 'Mexico'].includes(p.country)),
  'Americas - South': WORLD_PORTS.filter(p => ['Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Panama', 'Dominican Republic'].includes(p.country)),
  'Oceania': WORLD_PORTS.filter(p => ['Australia', 'New Zealand'].includes(p.country)),
}

// Typical voyage schedules by major lane (days between sailings, transit time)
export const VOYAGE_SCHEDULES = {
  'CNSHA-GBFXT': { frequency: 7, transit: 32, carriers: ['MSC', 'Maersk', 'CMA CGM', 'COSCO'] },
  'CNSHA-NLRTM': { frequency: 7, transit: 30, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd', 'COSCO'] },
  'CNSHA-USLAX': { frequency: 7, transit: 14, carriers: ['MSC', 'Maersk', 'CMA CGM', 'Evergreen'] },
  'CNSHA-USNYC': { frequency: 7, transit: 25, carriers: ['MSC', 'Maersk', 'COSCO', 'ZIM'] },
  'CNSHA-ZADUR': { frequency: 14, transit: 22, carriers: ['MSC', 'Maersk', 'PIL'] },
  'CNSHA-AEJEA': { frequency: 7, transit: 18, carriers: ['MSC', 'COSCO', 'Hapag-Lloyd'] },
  'CNSHA-SGSIN': { frequency: 3, transit: 5, carriers: ['MSC', 'Maersk', 'COSCO', 'PIL', 'Evergreen'] },
  'INNSA-ZADUR': { frequency: 14, transit: 14, carriers: ['MSC', 'Maersk', 'PIL'] },
  'INNSA-AEJEA': { frequency: 7, transit: 4, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd'] },
  'INNSA-GBFXT': { frequency: 7, transit: 22, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd'] },
  'INNSA-NLRTM': { frequency: 7, transit: 20, carriers: ['MSC', 'Maersk', 'CMA CGM'] },
  'NLRTM-USNYC': { frequency: 7, transit: 10, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd', 'CMA CGM'] },
  'NLRTM-ZADUR': { frequency: 14, transit: 20, carriers: ['MSC', 'Maersk'] },
  'AEJEA-ZADUR': { frequency: 14, transit: 12, carriers: ['MSC', 'PIL', 'COSCO'] },
  'AEJEA-KEMBA': { frequency: 7, transit: 6, carriers: ['MSC', 'Maersk', 'PIL'] },
  'THBKK-AEJEA': { frequency: 7, transit: 10, carriers: ['MSC', 'Evergreen', 'PIL'] },
  'THBKK-GBFXT': { frequency: 14, transit: 28, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd'] },
  'SGSIN-GBFXT': { frequency: 7, transit: 24, carriers: ['MSC', 'Maersk', 'CMA CGM'] },
  'SGSIN-ZADUR': { frequency: 14, transit: 14, carriers: ['MSC', 'PIL'] },
  'BRSSZ-NLRTM': { frequency: 14, transit: 18, carriers: ['MSC', 'Maersk', 'Hapag-Lloyd'] },
  'BRSSZ-CNSHA': { frequency: 14, transit: 30, carriers: ['MSC', 'COSCO'] },
}

// Estimate next sailings based on route
export function getEstimatedVoyages(originCode, destCode, fromDate) {
  const key1 = `${originCode}-${destCode}`
  const key2 = `${destCode}-${originCode}`
  const schedule = VOYAGE_SCHEDULES[key1] || VOYAGE_SCHEDULES[key2]

  if (!schedule) {
    // Generic estimate
    return {
      found: false,
      message: 'No schedule data for this route. Typical ocean sailings depart weekly on major lanes.',
      voyages: [],
    }
  }

  const from = fromDate ? new Date(fromDate) : new Date()
  const voyages = []

  for (let i = 0; i < 4; i++) {
    const departDate = new Date(from)
    departDate.setDate(departDate.getDate() + (i * schedule.frequency) + Math.floor(Math.random() * 3))
    const arriveDate = new Date(departDate)
    arriveDate.setDate(arriveDate.getDate() + schedule.transit)

    voyages.push({
      carrier: schedule.carriers[i % schedule.carriers.length],
      departure: departDate.toISOString().split('T')[0],
      arrival: arriveDate.toISOString().split('T')[0],
      transit_days: schedule.transit,
    })
  }

  return {
    found: true,
    frequency_days: schedule.frequency,
    voyages,
  }
}
