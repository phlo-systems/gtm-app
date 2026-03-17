/**
 * GTM COS Engine
 *
 * Implements the Cost of Sales model from the solutioning document.
 * Produces per-container and per-case breakdowns for all cost lines,
 * management fees, and the final Selling Price to Customer.
 *
 * Usage:
 *   import { computeCOS, DEFAULT_POLICY } from '@/lib/cos-engine';
 *   const result = computeCOS(deal, policyDefaults, existingAmouns);
 */

// ─────────────────────────────────────────────────────────────────────────────
// INCOTERM LEVELS
// ─────────────────────────────────────────────────────────────────────────────
const INCOTERM_LEVELS = {
  EXW: 0, FCA: 1, FAS: 2, FOB: 3,
  CFR: 5, CIF: 6, CPT: 5, CIP: 6,
  DAP: 8, DPU: 9, DDP: 10,
};

// Gap cost lines activated between buying and selling incoterm.
// level = the selling incoterm level at which this cost becomes the trader's responsibility.
// incoterms = optional whitelist (for lines that don't follow the simple level rule).
const GAP_COST_LINES = [
  { id: 'xhaul_origin',         level: 1,   stage: 'ORIGIN',            label: 'X-Haul – Factory to Port',             calc: 'manual' },
  { id: 'export_clearance',     level: 2,   stage: 'ORIGIN',            label: 'Export Clearance & Documentation',      calc: 'manual' },
  { id: 'origin_landside',      level: 3,   stage: 'ORIGIN',            label: 'Origin Landside Charges (THC)',         calc: 'manual' },
  { id: 'ocean_freight',        level: 5,   stage: 'MAIN_CARRIAGE',     label: 'Ocean Freight',                         calc: 'manual' },
  { id: 'marine_insurance',     level: 6,   stage: 'MAIN_CARRIAGE',     label: 'Marine Insurance',                      calc: 'rate_on_cost_plus_freight' },
  { id: 'collect_domestic',     level: 5.5, stage: 'PRIMARY_TRANSPORT', label: 'Collect Domestic Stock from Factory',   calc: 'manual', incoterms: ['CPT','CIP','DAP','DDP'] },
  { id: 'dest_import_duty',     level: 10,  stage: 'DESTINATION',       label: 'Import Duty',                           calc: 'rate_on_selling_price' },
  { id: 'dest_customs',         level: 8,   stage: 'DESTINATION',       label: 'Import Customs Clearance',              calc: 'manual' },
  { id: 'dest_landside',        level: 8,   stage: 'DESTINATION',       label: 'Destination Landside Charges (THC)',    calc: 'manual' },
  { id: 'xhaul_dest',           level: 8,   stage: 'DESTINATION',       label: 'X-Haul – Port to Warehouse / DC',       calc: 'manual' },
  { id: 'handling_palletising', level: 8,   stage: 'WAREHOUSE',         label: 'Handling-In & Palletising',             calc: 'manual' },
  { id: 'stock_insurance',      level: 5.5, stage: 'INSURANCE',         label: 'Stock Insurance',                       calc: 'manual', incoterms: ['CPT','CIP','DAP'] },
  { id: 'warehousing',          level: 5.5, stage: 'WAREHOUSE',         label: 'Warehousing & Handling-Out',            calc: 'manual', incoterms: ['CPT','CIP'] },
  { id: 'transport_retail_dc',  level: 10,  stage: 'PRIMARY_TRANSPORT', label: 'Transport to Retail DC',                calc: 'manual' },
  { id: 'transport_retail_store',level:10,  stage: 'SECONDARY_TRANSPORT',label:'Transport to Retail Store',             calc: 'manual' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MANAGEMENT FEE POLICY DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_POLICY = {
  finance_rate_pct:              12.00,   // % p.a. applied to (cost + freight)
  financing_gap_days:            30,      // days (overridden by customer - supplier payment terms)
  gl_liability_rate_pct:         0.00,    // % of supplier cost
  global_supply_chain_fee:       165.00,  // $ fixed per container
  provision_delays:              100.00,  // $ fixed per container
  merchandising_rate_pct:        3.00,    // % of supplier cost
  finance_insurance_rate_pct:    0.12,    // % of (cost + freight)
  omni_management_fee_rate_pct:  8.00,    // % of subtotal before management
  under_over_recovery_rate_pct:  0.20,    // % of subtotal before management
  buying_trader_margin_split:    30,      // % of total trading margin
  selling_trader_margin_split:   70,      // % of total trading margin
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function incotermLevel(term) {
  const t = (term || '').split(' ')[0].toUpperCase();
  return INCOTERM_LEVELS[t] ?? null;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function perCase(amountPerContainer, casesPerContainer) {
  if (!casesPerContainer) return 0;
  return round2(amountPerContainer / casesPerContainer);
}

function paymentTermDays(term) {
  if (!term) return 30;
  const m = (term + '').match(/(\d+)/);
  if (m) return parseInt(m[1]);
  if (/sight/i.test(term)) return 0;
  return 30;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP LINES RESOLVER
// ─────────────────────────────────────────────────────────────────────────────
export function resolveGapLines(buyIncoterm, sellIncoterm) {
  const buyLevel  = incotermLevel(buyIncoterm);
  const sellLevel = incotermLevel(sellIncoterm);
  if (buyLevel === null || sellLevel === null) return [];
  const sellTerm = (sellIncoterm || '').split(' ')[0].toUpperCase();

  return GAP_COST_LINES.filter(line => {
    if (line.incoterms) return line.incoterms.includes(sellTerm);
    return line.level > buyLevel && line.level <= sellLevel;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Compute the full COS matrix for a deal.
 *
 * @param {Object} deal            - Deal record (may include deal.extended)
 * @param {Object} policy          - Policy defaults (merged with DEFAULT_POLICY)
 * @param {Object} existingAmounts - { line_id: number } for manual/API amounts
 *                                   Include 'marine_insurance_rate' (%) here if known.
 * @returns {Object} Full COS result with lines[], totals, and selling price
 */
export function computeCOS(deal, policy = {}, existingAmounts = {}) {
  const p   = { ...DEFAULT_POLICY, ...policy };
  const ext = deal.extended || {};

  // ── Container quantities ───────────────────────────────────────────────────
  const casesPerContainer =
    (parseInt(ext.pallets_per_container) || 0) * (parseInt(ext.cases_per_pallet) || 0)
    || parseInt(deal.cases_per_container) || 100;

  const costPricePerCase = parseFloat(deal.unit_price) || 0;

  // ── Block A: Supplier cost ─────────────────────────────────────────────────
  const supplierCostPerContainer = round2(costPricePerCase * casesPerContainer);

  const lines = [];
  let sortOrder = 0;

  lines.push({
    id: 'supplier_cost',
    block: 'A',
    stage: 'SUPPLIER',
    label: `Supplier Cost (${deal.buy_incoterm || 'FOB'})`,
    cost_type: 'base',
    amount: supplierCostPerContainer,
    amount_per_case: costPricePerCase,
    currency: deal.cost_currency || 'USD',
    source: 'formula',
    responsibility: 'Supplier',
    sort_order: sortOrder++,
    is_active: true,
    formula: `${costPricePerCase} × ${casesPerContainer} cases`,
  });

  // ── Block B: Incoterm gap lines ────────────────────────────────────────────
  const oceanFreightAmount = parseFloat(existingAmounts['ocean_freight']) || 0;
  const costPlusFreight    = supplierCostPerContainer + oceanFreightAmount;

  for (const line of resolveGapLines(deal.buy_incoterm, deal.sell_incoterm)) {
    let amount = parseFloat(existingAmounts[line.id]) || 0;

    if (line.id === 'marine_insurance' && amount === 0) {
      const rate = (parseFloat(existingAmounts['marine_insurance_rate']) || 0) / 100;
      amount = round2(costPlusFreight * rate);
    }

    lines.push({
      id: line.id,
      block: 'B',
      stage: line.stage,
      label: line.label,
      cost_type: 'incoterm_gap',
      amount: round2(amount),
      amount_per_case: perCase(amount, casesPerContainer),
      currency: deal.cost_currency || 'USD',
      source: 'manual',
      responsibility: 'Trader',
      sort_order: sortOrder++,
      is_active: true,
    });
  }

  // ── Block C: Management fees ──────────────────────────────────────────────
  const supplierDays   = paymentTermDays(ext.supplier_payment_terms || 'Net 30');
  const customerDays   = paymentTermDays(deal.customer_payment_terms || 'Net 60');
  const financingGapDays = Math.max(0, customerDays - supplierDays) || p.financing_gap_days;

  const financeCharge    = round2(costPlusFreight * (p.finance_rate_pct / 100) * (financingGapDays / 365));
  const glLiability      = round2(supplierCostPerContainer * (p.gl_liability_rate_pct / 100));
  const merchandising    = round2(supplierCostPerContainer * (p.merchandising_rate_pct / 100));
  const financeInsurance = round2(costPlusFreight * (p.finance_insurance_rate_pct / 100));

  const mgmtLines = [
    { id: 'finance_charge',          label: `Finance Charge (${p.finance_rate_pct}% p.a. / ${financingGapDays}d)`, amount: financeCharge,    formula: `(Cost+Freight) × ${p.finance_rate_pct}% × ${financingGapDays}/365` },
    { id: 'gl_liability',            label: `GL & Product Liability (${p.gl_liability_rate_pct}%)`,                 amount: glLiability,      formula: `Supplier Cost × ${p.gl_liability_rate_pct}%` },
    { id: 'global_supply_chain_fee', label: 'Global Supply Chain Fee',                                              amount: round2(p.global_supply_chain_fee), formula: `Fixed ${p.global_supply_chain_fee}/container` },
    { id: 'provision_delays',        label: 'Provision for Delays / Penalties',                                     amount: round2(p.provision_delays),        formula: `Fixed ${p.provision_delays}/container` },
    { id: 'merchandising',           label: `Merchandising (${p.merchandising_rate_pct}%)`,                        amount: merchandising,    formula: `Supplier Cost × ${p.merchandising_rate_pct}%` },
    { id: 'finance_insurance',       label: `Finance Insurance (${p.finance_insurance_rate_pct}%)`,                amount: financeInsurance, formula: `(Cost+Freight) × ${p.finance_insurance_rate_pct}%` },
  ];

  for (const fee of mgmtLines) {
    lines.push({
      id: fee.id, block: 'C', stage: 'MANAGEMENT', label: fee.label,
      cost_type: 'management_fee', amount: fee.amount,
      amount_per_case: perCase(fee.amount, casesPerContainer),
      currency: deal.cost_currency || 'USD',
      source: 'policy', responsibility: 'Trader',
      sort_order: sortOrder++, is_active: true, formula: fee.formula,
    });
  }

  // ── Subtotal & trading margin ─────────────────────────────────────────────
  const subtotalBeforeManagement = round2(
    lines.filter(l => l.is_active).reduce((s, l) => s + l.amount, 0)
  );

  const omniManagementFee = round2(subtotalBeforeManagement * (p.omni_management_fee_rate_pct / 100));
  const underOverRecovery = round2(subtotalBeforeManagement * (p.under_over_recovery_rate_pct / 100));
  const totalTradingMargin = round2(omniManagementFee + underOverRecovery);

  lines.push({
    id: 'omni_management_fee', block: 'C', stage: 'MANAGEMENT',
    label: `Management Fee (${p.omni_management_fee_rate_pct}%)`,
    cost_type: 'management_fee', amount: omniManagementFee,
    amount_per_case: perCase(omniManagementFee, casesPerContainer),
    currency: deal.cost_currency || 'USD', source: 'policy', responsibility: 'Trader',
    sort_order: sortOrder++, is_active: true, is_management_line: true,
    formula: `Subtotal × ${p.omni_management_fee_rate_pct}%`,
  });

  lines.push({
    id: 'under_over_recovery', block: 'C', stage: 'MANAGEMENT',
    label: `Under/Over Recovery (${p.under_over_recovery_rate_pct}%)`,
    cost_type: 'management_fee', amount: underOverRecovery,
    amount_per_case: perCase(underOverRecovery, casesPerContainer),
    currency: deal.cost_currency || 'USD', source: 'policy', responsibility: 'Trader',
    sort_order: sortOrder++, is_active: true, is_management_line: true,
    formula: `Subtotal × ${p.under_over_recovery_rate_pct}%`,
  });

  // ── Final selling price ───────────────────────────────────────────────────
  const sellingPricePerContainer = round2(subtotalBeforeManagement + totalTradingMargin);
  const sellingPricePerCase      = perCase(sellingPricePerContainer, casesPerContainer);
  const buyingTraderMargin       = round2(totalTradingMargin * (p.buying_trader_margin_split / 100));
  const sellingTraderMargin      = round2(totalTradingMargin * (p.selling_trader_margin_split / 100));
  const totalTradingMarginPct    = round2(
    sellingPricePerContainer > 0 ? (totalTradingMargin / sellingPricePerContainer) * 100 : 0
  );

  // Update per-case for all lines
  for (const l of lines) l.amount_per_case = perCase(l.amount, casesPerContainer);

  return {
    lines,
    casesPerContainer,
    costPricePerCase,
    supplierCostPerContainer,
    oceanFreightAmount,
    costPlusFreight,
    financingGapDays,
    subtotalBeforeManagement,
    omniManagementFee,
    underOverRecovery,
    totalTradingMargin,
    totalTradingMarginPct,
    sellingPricePerContainer,
    sellingPricePerCase,
    buyingTraderMargin,
    sellingTraderMargin,
  };
}

/**
 * Map COS result lines to the cost_lines DB schema.
 */
export function cosResultToDbLines(cosResult, matrixId) {
  return cosResult.lines.map(line => ({
    matrix_id:      matrixId,
    block:          line.block,
    line_item:      line.label,
    cost_type:      line.cost_type,
    calc_type:      'calculated',
    amount:         line.amount,
    amount_per_unit:line.amount_per_case,
    currency:       line.currency,
    source:           (line.source === 'policy' || line.source === 'formula') ? 'calculated' : (line.source || 'manual'),
    responsibility: line.responsibility,
    sort_order:     line.sort_order,
    is_active:      line.is_active,
    notes:          line.formula || null,
  }));
}
