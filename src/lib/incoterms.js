/**
 * GTM Incoterm Gap Engine
 * 
 * Calculates the responsibility gap between buying and selling incoterms
 * and determines which cost blocks the trader must cover.
 * 
 * Incoterms 2020: EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP
 */

// Incoterm responsibility levels (0 = origin, 10 = delivered)
const INCOTERM_LEVELS = {
  'EXW': 0,  // Ex Works - buyer bears all from factory
  'FCA': 1,  // Free Carrier - seller delivers to carrier
  'FAS': 2,  // Free Alongside Ship - seller delivers alongside vessel
  'FOB': 3,  // Free On Board - seller loads onto vessel
  'CFR': 5,  // Cost and Freight - seller pays freight to destination
  'CIF': 6,  // Cost, Insurance, Freight - seller pays freight + insurance
  'CPT': 5,  // Carriage Paid To - like CFR but any transport
  'CIP': 6,  // Carriage and Insurance Paid - like CIF but any transport
  'DAP': 8,  // Delivered At Place - seller delivers to destination (unloaded)
  'DPU': 9,  // Delivered at Place Unloaded - seller unloads at destination
  'DDP': 10, // Delivered Duty Paid - seller bears all including duties
};

// Cost blocks activated at each responsibility level
const COST_BLOCKS = [
  { level: 1, line: 'Origin Inland Transport', desc: 'Transport from factory/warehouse to origin port/terminal' },
  { level: 2, line: 'Export Clearance & Documentation', desc: 'Export customs clearance, documentation, certificates' },
  { level: 3, line: 'Origin Terminal Handling', desc: 'Loading onto vessel/transport, terminal charges' },
  { level: 5, line: 'Main Carriage (Freight)', desc: 'Ocean freight, air freight, or road transport to destination' },
  { level: 6, line: 'Cargo Insurance', desc: 'Marine/cargo insurance for transit (typically 110% cargo value)' },
  { level: 7, line: 'Destination Port Handling', desc: 'Unloading, terminal handling at destination port' },
  { level: 8, line: 'Destination Inland Delivery', desc: 'Transport from destination port to final delivery point' },
  { level: 9, line: 'Unloading at Destination', desc: 'Unloading at buyer premises or designated point' },
  { level: 10, line: 'Import Clearance & Duties', desc: 'Import customs clearance, duties, taxes at destination' },
];

/**
 * Calculate the incoterm responsibility gap
 * @param {string} buyIncoterm - e.g., "FOB"
 * @param {string} sellIncoterm - e.g., "CIF"
 * @returns {Object} Gap analysis result
 */
export function calculateIncotermGap(buyIncoterm, sellIncoterm) {
  const buyTerm = buyIncoterm.split(' ')[0].toUpperCase();
  const sellTerm = sellIncoterm.split(' ')[0].toUpperCase();
  
  const buyLevel = INCOTERM_LEVELS[buyTerm];
  const sellLevel = INCOTERM_LEVELS[sellTerm];
  
  if (buyLevel === undefined || sellLevel === undefined) {
    return { valid: false, error: `Unknown incoterm: ${buyLevel === undefined ? buyTerm : sellTerm}` };
  }
  
  const hasGap = sellLevel > buyLevel;
  const gapCosts = hasGap
    ? COST_BLOCKS.filter(block => block.level > buyLevel && block.level <= sellLevel)
    : [];
  
  return {
    valid: true,
    buyTerm,
    sellTerm,
    buyLevel,
    sellLevel,
    hasGap,
    gapSize: sellLevel - buyLevel,
    gapCosts: gapCosts.map(c => ({
      lineItem: c.line,
      description: c.desc,
      costType: 'incoterm_gap',
      block: 'B',
      responsibility: 'trader',
    })),
    summary: hasGap
      ? `${buyTerm} → ${sellTerm}: ${gapCosts.length} cost blocks activated (trader responsibility)`
      : `${buyTerm} → ${sellTerm}: No gap — incoterms are aligned or seller covers more`,
  };
}

/**
 * Generate a complete cost matrix for a deal
 * @param {Object} deal - Deal data
 * @param {Array} businessCharges - Tenant's business charge templates
 * @returns {Array} Cost lines for the matrix
 */
export function generateCostMatrix(deal, businessCharges = []) {
  const lines = [];
  let sortOrder = 0;
  
  // Block A: Base supplier cost = quantity * unit price
  const supplierCost = (deal.unit_price || 0) * (deal.quantity || 1);
  lines.push({
    block: 'A',
    line_item: `Supplier Cost (${deal.buy_incoterm || 'FOB'} ${deal.buy_location || ''}) — ${deal.quantity || 1} ${deal.quantity_unit || 'MT'} @ ${deal.cost_currency || 'USD'} ${deal.unit_price || 0}`,
    cost_type: 'base',
    calc_type: 'fixed',
    amount: supplierCost,
    amount_per_unit: deal.unit_price || 0,
    currency: deal.cost_currency || 'USD',
    source: 'manual',
    responsibility: 'Supplier',
    sort_order: sortOrder++,
    is_active: true,
  });
  
  // Block B: Incoterm gap costs
  const gap = calculateIncotermGap(
    deal.buy_incoterm || 'FOB',
    deal.sell_incoterm || 'CIF'
  );
  
  if (gap.valid && gap.hasGap) {
    for (const gapCost of gap.gapCosts) {
      lines.push({
        block: 'B',
        line_item: gapCost.lineItem,
        cost_type: 'incoterm_gap',
        calc_type: 'fixed',
        amount: 0, // User fills in estimates
        amount_per_unit: 0,
        currency: deal.cost_currency || 'USD',
        source: 'manual',
        responsibility: 'Trader',
        sort_order: sortOrder++,
        is_active: true,
      });
    }
  }
  
  // Block C: Business charges (from tenant templates)
  for (const charge of businessCharges) {
    if (!charge.is_active) continue;
    
    let amount = 0;
    if (charge.calc_type === 'fixed') {
      amount = charge.default_value;
    } else if (charge.calc_type === 'percentage') {
      amount = (supplierCost * charge.default_value) / 100;
    }
    
    lines.push({
      block: 'C',
      line_item: `${charge.name} (${charge.default_value}${charge.calc_type === 'percentage' ? '%' : ''})`,
      cost_type: 'business_charge',
      calc_type: charge.calc_type,
      amount: Math.round(amount * 100) / 100,
      amount_per_unit: 0,
      currency: deal.cost_currency || 'USD',
      source: 'template',
      responsibility: 'Trader',
      sort_order: sortOrder++,
      is_active: true,
    });
  }
  
  return lines;
}

/**
 * Calculate margin from cost lines
 * @param {Array} costLines - Array of cost line objects
 * @param {number} sellingPrice - The total selling price
 * @returns {Object} Margin calculation
 */
export function calculateMargin(costLines, sellingPrice) {
  const totalCost = costLines
    .filter(l => l.is_active)
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  
  const grossProfit = sellingPrice - totalCost;
  const grossMarginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    sellingPrice,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPct: Math.round(grossMarginPct * 100) / 100,
    supplierCost: costLines.find(l => l.block === 'A')?.amount || 0,
    incotermCosts: costLines.filter(l => l.block === 'B' && l.is_active).reduce((s, l) => s + (l.amount || 0), 0),
    businessCharges: costLines.filter(l => l.block === 'C' && l.is_active).reduce((s, l) => s + (l.amount || 0), 0),
    additionalCosts: costLines.filter(l => l.block === 'D' && l.is_active).reduce((s, l) => s + (l.amount || 0), 0),
  };
}

// List of all Incoterms 2020 for dropdowns
export const INCOTERMS_2020 = [
  { code: 'EXW', name: 'Ex Works', group: 'Any Transport' },
  { code: 'FCA', name: 'Free Carrier', group: 'Any Transport' },
  { code: 'CPT', name: 'Carriage Paid To', group: 'Any Transport' },
  { code: 'CIP', name: 'Carriage and Insurance Paid To', group: 'Any Transport' },
  { code: 'DAP', name: 'Delivered At Place', group: 'Any Transport' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', group: 'Any Transport' },
  { code: 'DDP', name: 'Delivered Duty Paid', group: 'Any Transport' },
  { code: 'FAS', name: 'Free Alongside Ship', group: 'Sea/Inland Waterway' },
  { code: 'FOB', name: 'Free On Board', group: 'Sea/Inland Waterway' },
  { code: 'CFR', name: 'Cost and Freight', group: 'Sea/Inland Waterway' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', group: 'Sea/Inland Waterway' },
];
