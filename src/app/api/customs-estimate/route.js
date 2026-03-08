import { NextResponse } from 'next/server'

// Average import duty rates by country and HS chapter (first 2 digits)
// Sources: WTO Tariff Profiles, national customs schedules
const DUTY_RATES = {
  // South Africa (SARS Schedule 1)
  ZA: { default: 10, chapters: { '02': 40, '04': 20, '07': 10, '08': 5, '09': 7.5, '15': 10, '17': 20, '19': 20, '20': 20, '21': 20, '22': 25, '24': 45, '27': 0, '39': 10, '44': 5, '61': 45, '62': 45, '84': 0, '85': 5, '87': 25 }, vat: 15, name: 'South Africa' },
  // United Kingdom (HMRC)
  GB: { default: 4, chapters: { '02': 12, '04': 8, '07': 10, '08': 7, '09': 0, '15': 6, '17': 12, '19': 9, '20': 18, '21': 8, '22': 8, '24': 57, '27': 0, '39': 6.5, '61': 12, '62': 12, '84': 0, '85': 2, '87': 6.5 }, vat: 20, name: 'United Kingdom' },
  // UAE (Federal Customs Authority)
  AE: { default: 5, chapters: { '02': 5, '04': 5, '07': 5, '08': 5, '22': 50, '24': 100, '27': 0, '84': 5, '85': 5, '87': 5 }, vat: 5, name: 'UAE' },
  // Saudi Arabia (ZATCA)
  SA: { default: 5, chapters: { '02': 5, '04': 5, '22': 50, '24': 100, '27': 0, '87': 7 }, vat: 15, name: 'Saudi Arabia' },
  // India
  IN: { default: 10, chapters: { '02': 30, '04': 30, '07': 30, '08': 30, '09': 30, '15': 45, '17': 50, '22': 150, '24': 100, '27': 5, '39': 7.5, '61': 20, '84': 7.5, '85': 10, '87': 60 }, vat: 18, name: 'India' },
  // Thailand
  TH: { default: 10, chapters: { '02': 30, '04': 18, '07': 40, '08': 30, '15': 20, '17': 30, '22': 60, '24': 60, '27': 0, '84': 5, '85': 10, '87': 80 }, vat: 7, name: 'Thailand' },
  // Philippines
  PH: { default: 10, chapters: { '02': 10, '04': 7, '07': 15, '08': 10, '22': 20, '24': 20, '27': 3, '84': 3, '85': 5, '87': 30 }, vat: 12, name: 'Philippines' },
  // Oman
  OM: { default: 5, chapters: { '22': 100, '24': 100, '27': 0 }, vat: 5, name: 'Oman' },
  // Australia
  AU: { default: 5, chapters: { '02': 0, '04': 4, '07': 5, '08': 5, '22': 5, '24': 5, '27': 0, '84': 0, '85': 0, '87': 5 }, vat: 10, name: 'Australia' },
  // Brazil
  BR: { default: 14, chapters: { '02': 10, '04': 16, '07': 10, '08': 10, '15': 10, '17': 16, '22': 20, '24': 20, '27': 0, '84': 14, '85': 16, '87': 35 }, vat: 17, name: 'Brazil' },
  // Mexico
  MX: { default: 10, chapters: { '02': 20, '04': 20, '07': 15, '08': 20, '17': 20, '22': 20, '24': 67, '27': 0, '84': 5, '85': 5, '87': 20 }, vat: 16, name: 'Mexico' },
  // Namibia (SACU same as ZA)
  NA: { default: 10, chapters: { '02': 40, '04': 20, '07': 10, '17': 20, '22': 25, '27': 0, '61': 45, '87': 25 }, vat: 15, name: 'Namibia' },
  // Angola
  AO: { default: 10, chapters: { '02': 20, '04': 10, '07': 10, '17': 30, '22': 30, '27': 2, '84': 2, '87': 10 }, vat: 14, name: 'Angola' },
  // Mauritius
  MU: { default: 15, chapters: { '02': 25, '04': 15, '07': 10, '17': 40, '22': 25, '24': 310, '27': 0, '84': 0, '87': 55 }, vat: 15, name: 'Mauritius' },
  // Argentina
  AR: { default: 12, chapters: { '02': 10, '04': 12, '07': 10, '17': 16, '22': 20, '27': 0, '84': 14, '85': 16, '87': 35 }, vat: 21, name: 'Argentina' },
  // Chile
  CL: { default: 6, chapters: { '27': 0 }, vat: 19, name: 'Chile' },
  // Dominican Republic
  DO: { default: 14, chapters: { '02': 25, '04': 20, '17': 20, '22': 20, '27': 0, '87': 20 }, vat: 18, name: 'Dominican Republic' },
  // US
  US: { default: 3.5, chapters: { '02': 4, '04': 15, '07': 8, '08': 5, '17': 12, '22': 5, '24': 30, '27': 0, '61': 15, '62': 15, '84': 2, '85': 2, '87': 2.5 }, vat: 0, name: 'United States' },
  // China
  CN: { default: 8, chapters: { '02': 12, '04': 10, '07': 13, '08': 15, '17': 30, '22': 20, '24': 25, '27': 0, '84': 8, '85': 8, '87': 15 }, vat: 13, name: 'China' },
}

// Map location text to country code
const COUNTRY_MAP = {
  'south africa': 'ZA', 'durban': 'ZA', 'cape town': 'ZA', 'johannesburg': 'ZA',
  'uk': 'GB', 'united kingdom': 'GB', 'london': 'GB', 'felixstowe': 'GB', 'southampton': 'GB',
  'uae': 'AE', 'dubai': 'AE', 'jebel ali': 'AE', 'abu dhabi': 'AE',
  'saudi': 'SA', 'jeddah': 'SA', 'riyadh': 'SA', 'dammam': 'SA',
  'india': 'IN', 'mumbai': 'IN', 'chennai': 'IN', 'nhava sheva': 'IN', 'delhi': 'IN', 'kolkata': 'IN',
  'thailand': 'TH', 'bangkok': 'TH', 'laem chabang': 'TH',
  'philippines': 'PH', 'manila': 'PH', 'cebu': 'PH',
  'oman': 'OM', 'muscat': 'OM', 'sohar': 'OM',
  'australia': 'AU', 'sydney': 'AU', 'melbourne': 'AU', 'brisbane': 'AU',
  'brazil': 'BR', 'santos': 'BR', 'rio': 'BR', 'sao paulo': 'BR',
  'mexico': 'MX', 'veracruz': 'MX', 'manzanillo': 'MX', 'mexico city': 'MX',
  'namibia': 'NA', 'walvis bay': 'NA', 'windhoek': 'NA',
  'angola': 'AO', 'luanda': 'AO',
  'mauritius': 'MU', 'port louis': 'MU',
  'argentina': 'AR', 'buenos aires': 'AR',
  'chile': 'CL', 'santiago': 'CL', 'valparaiso': 'CL',
  'dominican republic': 'DO', 'santo domingo': 'DO',
  'usa': 'US', 'united states': 'US', 'los angeles': 'US', 'new york': 'US', 'houston': 'US', 'savannah': 'US',
  'china': 'CN', 'shanghai': 'CN', 'shenzhen': 'CN', 'ningbo': 'CN', 'guangzhou': 'CN',
}

function resolveCountry(location) {
  if (!location) return null
  const lower = location.toLowerCase().trim()
  for (const [key, code] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(key)) return code
  }
  return null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const hsCode = searchParams.get('hs_code') || ''
  const destination = searchParams.get('destination') || ''
  const cargoValue = parseFloat(searchParams.get('cargo_value')) || 10000

  const countryCode = resolveCountry(destination)
  if (!countryCode) {
    return NextResponse.json({
      error: 'Could not identify destination country from: ' + destination,
      supported: Object.values(DUTY_RATES).map(r => r.name),
    }, { status: 400 })
  }

  const country = DUTY_RATES[countryCode]
  if (!country) {
    return NextResponse.json({ error: 'No duty data for ' + countryCode }, { status: 404 })
  }

  // Extract HS chapter (first 2 digits)
  const chapter = hsCode.replace(/\./g, '').substring(0, 2)
  const dutyRate = country.chapters[chapter] !== undefined ? country.chapters[chapter] : country.default

  const dutyAmount = Math.round(cargoValue * dutyRate / 100)
  const vatAmount = Math.round((cargoValue + dutyAmount) * country.vat / 100)
  const customsBrokerage = 250 // flat estimate
  const inspectionFees = 150

  return NextResponse.json({
    country: { code: countryCode, name: country.name },
    hs_code: hsCode,
    hs_chapter: chapter,
    cargo_value: cargoValue,
    estimates: {
      import_duty_rate: dutyRate,
      import_duty: dutyAmount,
      vat_rate: country.vat,
      vat_amount: vatAmount,
      customs_brokerage: customsBrokerage,
      inspection_fees: inspectionFees,
      total: dutyAmount + vatAmount + customsBrokerage + inspectionFees,
    },
    currency: 'USD',
    source: 'WTO Tariff Profile / National Schedule',
    disclaimer: 'Indicative rates. Actual duties depend on exact HS classification, origin preferences (FTAs), and customs valuation.',
  })
}
