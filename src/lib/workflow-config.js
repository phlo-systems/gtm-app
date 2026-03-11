/**
 * Workflow Configuration Engine
 * ==============================
 * Configurable deal workflow for different trading firm sizes.
 * Each tenant selects a preset at onboarding, then customises.
 *
 * Three phases: PRE-DEAL → DEAL → POST-DEAL
 * Each phase has toggleable steps and approval requirements.
 */

// ── Workflow Presets ──
export const WORKFLOW_PRESETS = {
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full structured process with scenarios, multi-level approval, and risk checks',
    icon: '🏢',
    preDeal: {
      enabled: true,
      label: 'Opportunities',
      scenariosEnabled: true,        // Can create multiple scenarios per opportunity
      maxScenarios: 10,
      costAssumptions: true,         // Model different cost assumptions
      scenarioComparison: true,      // Side-by-side comparison
      approvalRequired: true,
      approvalLevels: 2,             // 1 = single approver, 2 = two-level
      riskCheckRequired: true,
      creditCheckRequired: true,
      maxValueWithoutApproval: 0,    // All deals need approval
    },
    deal: {
      label: 'Deals',
      pricingModes: ['flat', 'basis', 'formula'],
      contractGeneration: true,
      fourEyePrinciple: true,        // Two approvers for deal booking
      documentsRequired: true,
      mandatoryFields: ['supplier_name', 'customer_name', 'buy_incoterm', 'sell_incoterm', 'unit_price', 'tonnage', 'hs_code'],
      lifecycleStages: ['draft', 'approved', 'fixing', 'contracted', 'shipped', 'delivered', 'invoiced', 'settled', 'closed'],
    },
    postDeal: {
      enabled: true,
      label: 'Settlement',
      invoicingRequired: true,
      qualityInspection: true,
      actualVsEstimated: true,       // Compare actual costs vs budgeted
      washoutAllowed: true,          // Can washout/cancel deals
      auditTrail: true,
    },
  },

  midsize: {
    id: 'midsize',
    name: 'Mid-Size',
    description: 'Standard process with optional feasibility check and single approval',
    icon: '🏬',
    preDeal: {
      enabled: true,
      label: 'Feasibility',
      scenariosEnabled: true,
      maxScenarios: 5,
      costAssumptions: true,
      scenarioComparison: true,
      approvalRequired: true,
      approvalLevels: 1,
      riskCheckRequired: false,
      creditCheckRequired: false,
      maxValueWithoutApproval: 100000,  // Auto-approve under $100K
    },
    deal: {
      label: 'Deals',
      pricingModes: ['flat', 'basis'],
      contractGeneration: true,
      fourEyePrinciple: false,
      documentsRequired: true,
      mandatoryFields: ['supplier_name', 'customer_name', 'buy_incoterm', 'sell_incoterm', 'unit_price'],
      lifecycleStages: ['draft', 'approved', 'fixing', 'contracted', 'shipped', 'delivered', 'invoiced', 'settled', 'closed'],
    },
    postDeal: {
      enabled: true,
      label: 'Post-Trade',
      invoicingRequired: true,
      qualityInspection: false,
      actualVsEstimated: true,
      washoutAllowed: true,
      auditTrail: true,
    },
  },

  startup: {
    id: 'startup',
    name: 'Small / Startup',
    description: 'Quick deal entry with minimal process — just enter and execute',
    icon: '🚀',
    preDeal: {
      enabled: false,                // Skip pre-deal entirely
      label: 'Feasibility',
      scenariosEnabled: false,
      maxScenarios: 0,
      costAssumptions: false,
      scenarioComparison: false,
      approvalRequired: false,
      approvalLevels: 0,
      riskCheckRequired: false,
      creditCheckRequired: false,
      maxValueWithoutApproval: Infinity,
    },
    deal: {
      label: 'Deals',
      pricingModes: ['flat'],
      contractGeneration: true,
      fourEyePrinciple: false,
      documentsRequired: false,
      mandatoryFields: ['supplier_name', 'customer_name', 'unit_price'],
      lifecycleStages: ['draft', 'approved', 'shipped', 'delivered', 'invoiced', 'closed'],
    },
    postDeal: {
      enabled: true,
      label: 'Settlement',
      invoicingRequired: true,
      qualityInspection: false,
      actualVsEstimated: false,
      washoutAllowed: false,
      auditTrail: false,
    },
  },
};

// ── Helper: Get workflow config for a tenant ──
export function getWorkflowConfig(presetId = 'midsize', overrides = {}) {
  const preset = WORKFLOW_PRESETS[presetId] || WORKFLOW_PRESETS.midsize;
  // Deep merge overrides
  return {
    ...preset,
    preDeal: { ...preset.preDeal, ...(overrides.preDeal || {}) },
    deal: { ...preset.deal, ...(overrides.deal || {}) },
    postDeal: { ...preset.postDeal, ...(overrides.postDeal || {}) },
  };
}

// ── Helper: Get nav items based on workflow config ──
export function getNavItemsForWorkflow(config, role = 'trader') {
  const nav = [];

  nav.push({ key: 'dashboard', icon: '\u25A1', label: 'Dashboard' });

  if (role === 'trader' || role === 'agent') {
    // Pre-Deal phase
    if (config.preDeal.enabled) {
      nav.push({ key: 'opportunities', icon: '\u{1F4A1}', label: config.preDeal.label || 'Opportunities' });
    }

    // Deal phase
    nav.push({ key: 'deals', icon: '\u25C6', label: config.deal.label || 'Deals' });
    nav.push({ key: 'precalc', icon: '\u25A0', label: 'Pre-Calc' });

    // Common
    nav.push({ key: 'customs', icon: '\u25C6', label: 'Customs' });

    // Post-Deal phase
    if (config.postDeal.enabled) {
      nav.push({ key: 'postcalc', icon: '\u25CF', label: config.postDeal.label || 'Post-Trade' });
    }
  }

  if (role === 'forwarder') {
    nav.push({ key: 'jobs', icon: '\u{1F6A2}', label: 'Jobs' });
  }

  // Common for all roles
  nav.push({ key: 'container_calc', icon: '\u25A0', label: 'Container Calc' });
  nav.push({ key: 'master_data', icon: '\u25C7', label: 'Master Data' });
  nav.push({ key: 'team', icon: '\u25CB', label: 'Team' });

  // Role-specific
  if (role === 'agent') nav.push({ key: 'agent', icon: '\u{1F4BC}', label: 'Agent' });
  if (role === 'financer') nav.push({ key: 'financer', icon: '\u{1F3E6}', label: 'Finance' });

  return nav;
}

// ── Helper: Check if a deal needs approval ──
export function needsApproval(config, dealValue) {
  if (!config.preDeal.approvalRequired) return false;
  if (dealValue < config.preDeal.maxValueWithoutApproval) return false;
  return true;
}

// ── Helper: Get visible lifecycle stages ──
export function getVisibleStages(config) {
  return config.deal.lifecycleStages || ['draft', 'approved', 'shipped', 'delivered', 'invoiced', 'closed'];
}

// ── Helper: Check if a field is mandatory ──
export function isFieldMandatory(config, fieldName) {
  return (config.deal.mandatoryFields || []).includes(fieldName);
}
