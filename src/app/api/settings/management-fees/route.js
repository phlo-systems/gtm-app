/**
 * API: /api/settings/management-fees
 *
 * GET  - Returns tenant's management fee policy (falls back to DEFAULT_POLICY).
 * PUT  - Upserts policy values into business_charge_templates (category = 'management_fee').
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { DEFAULT_POLICY } from '@/lib/cos-engine';

export const FEE_DEFINITIONS = [
  { key: 'finance_rate_pct',             label: 'Finance Rate (% p.a.)',                  calc_type: 'percentage', sort_order: 1,  description: 'Annual funding rate on (cost + freight)' },
  { key: 'financing_gap_days',           label: 'Financing Gap Days (default)',            calc_type: 'fixed',      sort_order: 2,  description: 'Days between supplier payment and customer receipt' },
  { key: 'gl_liability_rate_pct',        label: 'GL & Product Liability (%)',              calc_type: 'percentage', sort_order: 3,  description: 'Risk provision as % of supplier cost' },
  { key: 'global_supply_chain_fee',      label: 'Global Supply Chain Fee (per container)', calc_type: 'fixed',      sort_order: 4,  description: 'Fixed admin fee per container' },
  { key: 'provision_delays',             label: 'Provision for Delays / Penalties',        calc_type: 'fixed',      sort_order: 5,  description: 'Flat buffer per container' },
  { key: 'merchandising_rate_pct',       label: 'Merchandising Rate (%)',                  calc_type: 'percentage', sort_order: 6,  description: 'Commercial markup on supplier cost' },
  { key: 'finance_insurance_rate_pct',   label: 'Finance Insurance Rate (%)',              calc_type: 'percentage', sort_order: 7,  description: '% of (cost + freight)' },
  { key: 'omni_management_fee_rate_pct', label: 'Management Fee Rate (%)',                 calc_type: 'percentage', sort_order: 8,  description: '% of subtotal applied as trading margin' },
  { key: 'under_over_recovery_rate_pct', label: 'Under/Over Recovery Rate (%)',            calc_type: 'percentage', sort_order: 9,  description: 'Contingency reserve on subtotal' },
  { key: 'buying_trader_margin_split',   label: 'Buying Trader Margin Split (%)',          calc_type: 'fixed',      sort_order: 10, description: '% of trading margin to buying trader' },
  { key: 'selling_trader_margin_split',  label: 'Selling Trader Margin Split (%)',         calc_type: 'fixed',      sort_order: 11, description: '% of trading margin to selling trader' },
];

export async function GET() {
  const { supabase, tenantId } = await getCurrentUser();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows } = await supabase
    .from('business_charge_templates')
    .select('name, default_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'management_fee');

  const policy = { ...DEFAULT_POLICY };
  const dbMap = Object.fromEntries((rows || []).map(r => [r.name, r.default_value]));
  for (const def of FEE_DEFINITIONS) {
    if (dbMap[def.key] !== undefined) policy[def.key] = dbMap[def.key];
  }

  return NextResponse.json({ policy, definitions: FEE_DEFINITIONS });
}

export async function PUT(request) {
  const { supabase, tenantId } = await getCurrentUser();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { policy: updates = {} } = await request.json();

  const upsertRows = FEE_DEFINITIONS.map(def => ({
    tenant_id:     tenantId,
    category:      'management_fee',
    name:          def.key,
    label:         def.label,
    description:   def.description,
    calc_type:     def.calc_type,
    default_value: updates[def.key] !== undefined ? parseFloat(updates[def.key]) : DEFAULT_POLICY[def.key],
    is_active:     true,
    sort_order:    def.sort_order,
  }));

  const { error } = await supabase
    .from('business_charge_templates')
    .upsert(upsertRows, { onConflict: 'tenant_id,category,name' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
