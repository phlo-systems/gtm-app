/**
 * Futures Pricing Engine — with proper UOM conversions
 * =====================================================
 * Each contract specifies:
 *   - quoteUnit:     What the exchange quotes (e.g. "cents/bushel")
 *   - divisor:       To convert quote to base currency (100 for cents→$, 1 for already $)
 *   - baseUnit:      After dividing (e.g. "$/bushel") — this is what basis is entered in
 *   - mtConversion:  Multiplier to get to $/MT (e.g. 36.7437 bushels per MT)
 *
 * Formula: pricePerMT = (futuresQuote / divisor + basis) × mtConversion
 *
 * Example (CBOT Soybeans):
 *   Exchange: 1150 cents/bushel  →  1150/100 = $11.50/bushel
 *   Basis: +$2.35/bushel
 *   Per MT: ($11.50 + $2.35) × 36.7437 = $509.54/MT
 */

export const FUTURES_CONTRACTS = [
  // ── CBOT (CME Group) — Grains & Oilseeds ──
  { code: 'S',   name: 'CBOT Soybeans',      exchange: 'CBOT', quoteUnit: 'cents/bushel',   divisor: 100, baseUnit: '$/bushel',     mtConversion: 36.7437, months: 'FHKNQUX' },
  { code: 'SM',  name: 'CBOT Soybean Meal',   exchange: 'CBOT', quoteUnit: '$/short ton',   divisor: 1,   baseUnit: '$/short ton',  mtConversion: 1.10231, months: 'FHKNQUVZ' },
  { code: 'BO',  name: 'CBOT Soybean Oil',    exchange: 'CBOT', quoteUnit: 'cents/lb',      divisor: 100, baseUnit: '$/lb',         mtConversion: 2204.62, months: 'FHKNQUVZ' },
  { code: 'C',   name: 'CBOT Corn',           exchange: 'CBOT', quoteUnit: 'cents/bushel',   divisor: 100, baseUnit: '$/bushel',     mtConversion: 39.368,  months: 'HKNUZ' },
  { code: 'W',   name: 'CBOT Wheat',          exchange: 'CBOT', quoteUnit: 'cents/bushel',   divisor: 100, baseUnit: '$/bushel',     mtConversion: 36.7437, months: 'HKNUZ' },
  { code: 'O',   name: 'CBOT Oats',           exchange: 'CBOT', quoteUnit: 'cents/bushel',   divisor: 100, baseUnit: '$/bushel',     mtConversion: 68.8944, months: 'HKNUZ' },
  { code: 'RR',  name: 'CBOT Rough Rice',     exchange: 'CBOT', quoteUnit: 'cents/cwt',      divisor: 100, baseUnit: '$/cwt',        mtConversion: 22.0462, months: 'FHKNUX' },

  // ── ICE — Softs & Energy ──
  { code: 'KC',  name: 'ICE Coffee (Arabica)', exchange: 'ICE', quoteUnit: 'cents/lb',       divisor: 100, baseUnit: '$/lb',         mtConversion: 2204.62, months: 'HKNUZ' },
  { code: 'SB',  name: 'ICE Sugar #11',        exchange: 'ICE', quoteUnit: 'cents/lb',       divisor: 100, baseUnit: '$/lb',         mtConversion: 2204.62, months: 'HKNV' },
  { code: 'CC',  name: 'ICE Cocoa',            exchange: 'ICE', quoteUnit: '$/MT',           divisor: 1,   baseUnit: '$/MT',         mtConversion: 1,       months: 'HKNUZ' },
  { code: 'CT',  name: 'ICE Cotton #2',        exchange: 'ICE', quoteUnit: 'cents/lb',       divisor: 100, baseUnit: '$/lb',         mtConversion: 2204.62, months: 'HKNVZ' },
  { code: 'OJ',  name: 'ICE Orange Juice',     exchange: 'ICE', quoteUnit: 'cents/lb',       divisor: 100, baseUnit: '$/lb',         mtConversion: 2204.62, months: 'FHKNUX' },
  { code: 'CL',  name: 'ICE Brent Crude',      exchange: 'ICE', quoteUnit: '$/barrel',       divisor: 1,   baseUnit: '$/barrel',     mtConversion: 7.33,    months: 'All' },

  // ── COMEX ──
  { code: 'GC',  name: 'COMEX Gold',           exchange: 'COMEX', quoteUnit: '$/troy oz',    divisor: 1,   baseUnit: '$/troy oz',   mtConversion: 32150.7, months: 'GJMQVZ' },

  // ── SAFEX (JSE) — South African ──
  { code: 'WMAZ', name: 'SAFEX White Maize',    exchange: 'SAFEX', quoteUnit: 'ZAR/MT',      divisor: 1,   baseUnit: 'ZAR/MT',      mtConversion: 1,       months: 'HKNUZ' },
  { code: 'YMAZ', name: 'SAFEX Yellow Maize',   exchange: 'SAFEX', quoteUnit: 'ZAR/MT',      divisor: 1,   baseUnit: 'ZAR/MT',      mtConversion: 1,       months: 'HKNUZ' },
  { code: 'SUNS', name: 'SAFEX Sunflower',      exchange: 'SAFEX', quoteUnit: 'ZAR/MT',      divisor: 1,   baseUnit: 'ZAR/MT',      mtConversion: 1,       months: 'HKNUZ' },
  { code: 'SOYA', name: 'SAFEX Soybeans',       exchange: 'SAFEX', quoteUnit: 'ZAR/MT',      divisor: 1,   baseUnit: 'ZAR/MT',      mtConversion: 1,       months: 'HKNUZ' },
  { code: 'WEAT', name: 'SAFEX Wheat',          exchange: 'SAFEX', quoteUnit: 'ZAR/MT',      divisor: 1,   baseUnit: 'ZAR/MT',      mtConversion: 1,       months: 'HKNUZ' },

  // ── Palm Oil ──
  { code: 'FCPO', name: 'BMD Crude Palm Oil',   exchange: 'BMD',   quoteUnit: 'MYR/MT',      divisor: 1,   baseUnit: 'MYR/MT',      mtConversion: 1,       months: 'All' },
];

// ── Month code mapping ──
const MONTH_CODES = { F: 'Jan', G: 'Feb', H: 'Mar', J: 'Apr', K: 'May', M: 'Jun', N: 'Jul', Q: 'Aug', U: 'Sep', V: 'Oct', X: 'Nov', Z: 'Dec' };
const MONTH_NAMES = { F: 'January', G: 'February', H: 'March', J: 'April', K: 'May', M: 'June', N: 'July', Q: 'August', U: 'September', V: 'October', X: 'November', Z: 'December' };

/**
 * Get available contract months for a given code
 */
export function getAvailableContracts(contractCode) {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const results = [];

  for (let yearOffset = 0; yearOffset <= 2; yearOffset++) {
    const year = currentYear + yearOffset;
    const yearSuffix = year % 10;
    const months = contract.months === 'All'
      ? 'FGHJKMNQUVXZ'
      : contract.months;

    for (const mc of months) {
      const symbol = `${contract.code}${mc}${yearSuffix}`;
      results.push({
        symbol,
        monthCode: mc,
        monthName: MONTH_NAMES[mc],
        shortLabel: `${MONTH_CODES[mc]} ${year}`,
        year,
      });
    }
  }
  return results;
}

/**
 * Calculate flat price in $/MT from futures quote + basis
 *
 * @param {number} futuresQuote  — Price as quoted on exchange (e.g. 1150 cents/bushel or 350 $/short ton)
 * @param {number} basis         — Basis in base unit (e.g. 2.35 $/bushel)
 * @param {string} contractCode  — Contract code (e.g. 'S' for CBOT Soybeans)
 * @param {boolean} quoteInBaseUnit — If true, futures is already in base unit (e.g. 11.50 $/bushel, not 1150 cents)
 * @returns {{ pricePerMT, formula, details }}
 */
export function calculateFlatPrice(futuresQuote, basis, contractCode, quoteInBaseUnit = false) {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract) return { pricePerMT: 0, formula: 'Unknown contract', details: {} };

  // Step 1: Convert futures quote to base unit (e.g. cents/bushel → $/bushel)
  const futuresInBase = quoteInBaseUnit ? futuresQuote : futuresQuote / contract.divisor;

  // Step 2: Add basis (both now in same unit, e.g. $/bushel)
  const priceInBase = futuresInBase + basis;

  // Step 3: Convert to $/MT using the MT conversion factor
  const pricePerMT = priceInBase * contract.mtConversion;

  const formula = contract.divisor === 1
    ? `(${futuresQuote} + ${basis}) × ${contract.mtConversion} = ${pricePerMT.toFixed(2)} $/MT`
    : `(${futuresQuote}/${contract.divisor} + ${basis}) × ${contract.mtConversion} = (${futuresInBase.toFixed(4)} + ${basis}) × ${contract.mtConversion} = ${pricePerMT.toFixed(2)} $/MT`;

  return {
    pricePerMT: Math.round(pricePerMT * 100) / 100,
    formula,
    details: {
      futuresQuote,
      futuresInBase: Math.round(futuresInBase * 10000) / 10000,
      basis,
      priceInBase: Math.round(priceInBase * 10000) / 10000,
      quoteUnit: contract.quoteUnit,
      baseUnit: contract.baseUnit,
      mtConversion: contract.mtConversion,
      divisor: contract.divisor,
    },
  };
}

/**
 * Calculate rolled price
 */
export function calculateRollPrice(originalFutures, rollSpread, basis, contractCode, quoteInBaseUnit = false) {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract) return { pricePerMT: 0 };

  // Roll spread is in the same unit as the base unit (e.g. $/bushel)
  // The new futures = original futures (in base) + spread
  const originalInBase = quoteInBaseUnit ? originalFutures : originalFutures / contract.divisor;
  const rolledInBase = originalInBase + rollSpread;

  // New basis absorbs the roll: newBasis = oldBasis - rollSpread
  const newBasis = basis - rollSpread;
  const priceInBase = rolledInBase + newBasis;
  const pricePerMT = priceInBase * contract.mtConversion;

  return {
    pricePerMT: Math.round(pricePerMT * 100) / 100,
    rolledFutures: Math.round(rolledInBase * 10000) / 10000,
    newBasis: Math.round(newBasis * 10000) / 10000,
    formula: `Rolled: (${rolledInBase.toFixed(4)} + ${newBasis.toFixed(4)}) × ${contract.mtConversion} = ${pricePerMT.toFixed(2)} $/MT`,
  };
}

/**
 * Detect if a fetched price is likely in the exchange quote unit or base unit
 * e.g. CBOT Soybeans: if price > 100, it's probably cents/bushel; if < 30, it's $/bushel
 */
export function detectPriceUnit(price, contractCode) {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract || contract.divisor === 1) return { isQuoteUnit: true, isBaseUnit: true, confidence: 'high' };

  // For cents-based contracts: if price > 50, it's likely in cents; if < 50, likely in dollars
  if (contract.divisor === 100) {
    if (price > 50) return { isQuoteUnit: true, isBaseUnit: false, confidence: 'high', inBase: price / 100 };
    if (price < 30) return { isQuoteUnit: false, isBaseUnit: true, confidence: 'high', inBase: price };
    return { isQuoteUnit: true, isBaseUnit: false, confidence: 'medium', inBase: price / 100 };
  }

  return { isQuoteUnit: true, isBaseUnit: true, confidence: 'low' };
}
