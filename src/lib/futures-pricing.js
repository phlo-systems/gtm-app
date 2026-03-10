/**
 * Futures Pricing Engine
 * ======================
 * Handles basis pricing against commodity futures contracts.
 * Converts between bushels/short tons and metric tons.
 * Supports contract rolling with spread adjustments.
 *
 * Used by: Deal Sheet (Pre-Calc), Futures Pricing Widget
 */

// ── Futures Contract Definitions ──
export const FUTURES_EXCHANGES = {
  CBOT: { name: 'CME Group (CBOT)', currency: 'USD' },
  ICE: { name: 'ICE Futures', currency: 'USD' },
  LME: { name: 'London Metal Exchange', currency: 'USD' },
  SAFEX: { name: 'JSE/SAFEX', currency: 'ZAR' },
};

export const FUTURES_CONTRACTS = [
  // CBOT Grains & Oilseeds
  { code: 'S',   name: 'CBOT Soybeans',          exchange: 'CBOT', unit: 'Bushel',     mtConversion: 36.7437, months: 'FHKNQUX' },
  { code: 'SM',  name: 'CBOT Soybean Meal',      exchange: 'CBOT', unit: 'Short Ton',  mtConversion: 1.1023,  months: 'FHKNQUVZ' },
  { code: 'BO',  name: 'CBOT Soybean Oil',        exchange: 'CBOT', unit: 'Pound',      mtConversion: 2204.62, months: 'FHKNQUVZ' },
  { code: 'C',   name: 'CBOT Corn',              exchange: 'CBOT', unit: 'Bushel',     mtConversion: 39.3680, months: 'HKNUZ' },
  { code: 'W',   name: 'CBOT Wheat (SRW)',       exchange: 'CBOT', unit: 'Bushel',     mtConversion: 36.7437, months: 'HKNUZ' },
  { code: 'KW',  name: 'CBOT Wheat (HRW)',       exchange: 'CBOT', unit: 'Bushel',     mtConversion: 36.7437, months: 'HKNUZ' },
  { code: 'O',   name: 'CBOT Oats',              exchange: 'CBOT', unit: 'Bushel',     mtConversion: 68.8945, months: 'HKNUZ' },
  { code: 'RR',  name: 'CBOT Rough Rice',        exchange: 'CBOT', unit: 'CWT',        mtConversion: 22.0462, months: 'FHKNUX' },
  
  // ICE Softs
  { code: 'KC',  name: 'ICE Coffee C (Arabica)',  exchange: 'ICE',  unit: 'Pound',      mtConversion: 2204.62, months: 'HKNUZ' },
  { code: 'SB',  name: 'ICE Sugar #11',          exchange: 'ICE',  unit: 'Pound',      mtConversion: 2204.62, months: 'HKNV' },
  { code: 'CC',  name: 'ICE Cocoa',              exchange: 'ICE',  unit: 'Metric Ton', mtConversion: 1,       months: 'HKNUZ' },
  { code: 'CT',  name: 'ICE Cotton #2',          exchange: 'ICE',  unit: 'Pound',      mtConversion: 2204.62, months: 'HKNVZ' },
  { code: 'OJ',  name: 'ICE Orange Juice',       exchange: 'ICE',  unit: 'Pound',      mtConversion: 2204.62, months: 'FHKNUX' },
  
  // ICE Energy
  { code: 'CL',  name: 'NYMEX Crude Oil (WTI)',  exchange: 'ICE',  unit: 'Barrel',     mtConversion: 7.33,    months: 'FGHJKMNQUVXZ' },
  
  // Metals
  { code: 'GC',  name: 'COMEX Gold',             exchange: 'CBOT', unit: 'Troy Oz',    mtConversion: 32150.7, months: 'GJMQVZ' },
  
  // South Africa
  { code: 'WMAZ', name: 'SAFEX White Maize',     exchange: 'SAFEX', unit: 'Metric Ton', mtConversion: 1, months: 'HKNUZ' },
  { code: 'YMAZ', name: 'SAFEX Yellow Maize',    exchange: 'SAFEX', unit: 'Metric Ton', mtConversion: 1, months: 'HKNUZ' },
  { code: 'SUNS', name: 'SAFEX Sunflower Seed',  exchange: 'SAFEX', unit: 'Metric Ton', mtConversion: 1, months: 'HKNUZ' },
  { code: 'SOYA', name: 'SAFEX Soybeans',        exchange: 'SAFEX', unit: 'Metric Ton', mtConversion: 1, months: 'HKNUZ' },
  { code: 'WEAT', name: 'SAFEX Wheat',           exchange: 'SAFEX', unit: 'Metric Ton', mtConversion: 1, months: 'HKNUZ' },
];

// Month codes → month names
const MONTH_MAP = {
  F: { name: 'January', num: 1 },   G: { name: 'February', num: 2 },
  H: { name: 'March', num: 3 },     J: { name: 'April', num: 4 },
  K: { name: 'May', num: 5 },       M: { name: 'June', num: 6 },
  N: { name: 'July', num: 7 },      Q: { name: 'August', num: 8 },
  U: { name: 'September', num: 9 }, V: { name: 'October', num: 10 },
  X: { name: 'November', num: 11 }, Z: { name: 'December', num: 12 },
};

/**
 * Generate available contract months for a futures contract
 * e.g., 'SN6' = Soybeans July 2026, 'SMN6' = Soybean Meal July 2026
 */
export function getAvailableContracts(contractCode, yearsAhead = 2) {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract) return [];
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const results = [];
  
  for (let y = currentYear; y <= currentYear + yearsAhead; y++) {
    const yearDigit = y % 10;
    for (const monthCode of contract.months) {
      const month = MONTH_MAP[monthCode];
      if (!month) continue;
      
      // Skip past months in current year
      if (y === currentYear && month.num < now.getMonth() + 1) continue;
      
      results.push({
        symbol: `${contractCode}${monthCode}${yearDigit}`,
        contractCode,
        monthCode,
        monthName: month.name,
        year: y,
        yearDigit,
        label: `${contract.name} ${month.name} ${y}`,
        shortLabel: `${monthCode}${yearDigit} (${month.name.slice(0, 3)} ${y})`,
      });
    }
  }
  
  return results;
}

/**
 * Calculate flat price from basis + futures
 * @param {number} futuresPrice   - Futures settlement/close price
 * @param {number} basis          - Basis (premium/discount) in contract units
 * @param {string} contractCode   - e.g., 'S', 'SM'
 * @param {string} targetUnit     - 'MT' for metric ton (default)
 * @returns {object} { flatPrice, pricePerMT, calculation }
 */
export function calculateFlatPrice(futuresPrice, basis, contractCode, targetUnit = 'MT') {
  const contract = FUTURES_CONTRACTS.find(c => c.code === contractCode);
  if (!contract) return { error: 'Unknown contract code' };
  
  const priceInContractUnit = futuresPrice + basis;
  const pricePerMT = priceInContractUnit * contract.mtConversion;
  
  return {
    futuresPrice,
    basis,
    priceInContractUnit,
    contractUnit: contract.unit,
    conversionFactor: contract.mtConversion,
    pricePerMT: Math.round(pricePerMT * 100) / 100,
    calculation: `(${futuresPrice} + ${basis}) × ${contract.mtConversion} = ${pricePerMT.toFixed(2)} USD/MT`,
  };
}

/**
 * Calculate rolled price when switching contract months
 * @param {number} originalFutures - Original contract price
 * @param {number} rollSpread      - Spread between old and new contract (new - old)
 * @param {number} basis           - Original basis
 * @returns {object} Revised pricing
 */
export function calculateRollPrice(originalFutures, rollSpread, basis, contractCode) {
  const revisedFutures = originalFutures + rollSpread;
  const revisedBasis = basis; // Basis typically stays the same
  
  return {
    originalFutures,
    rollSpread,
    revisedFutures,
    basis: revisedBasis,
    ...calculateFlatPrice(revisedFutures, revisedBasis, contractCode),
  };
}

/**
 * Unit conversion utilities
 */
export const UNIT_CONVERSIONS = {
  'Bushel_Soybean_to_MT': 36.7437,
  'Bushel_Corn_to_MT': 39.3680,
  'Bushel_Wheat_to_MT': 36.7437,
  'ShortTon_to_MT': 1.1023,
  'LongTon_to_MT': 1.0160,
  'Pound_to_MT': 2204.62,
  'CWT_to_MT': 22.0462,
  'Barrel_to_MT': 7.33,
};

export function convertToMT(value, fromUnit, commodity = '') {
  if (fromUnit === 'Metric Ton' || fromUnit === 'MT') return value;
  
  const key = commodity
    ? `${fromUnit}_${commodity}_to_MT`
    : `${fromUnit}_to_MT`;
  
  const factor = UNIT_CONVERSIONS[key] || UNIT_CONVERSIONS[`${fromUnit}_to_MT`];
  if (!factor) return null;
  
  return Math.round(value * factor * 100) / 100;
}
