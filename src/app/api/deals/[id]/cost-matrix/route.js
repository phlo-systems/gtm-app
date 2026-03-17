import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { computeCOS, cosResultToDbLines } from '@/lib/cos-engine';

// POST - Generate a new cost matrix for a deal using the COS engine
export async function POST(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get the deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, product:products(units_per_case, cases_per_container)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single();

  if (dealError || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  // Load management fee policy from business_charge_templates
  const { data: policyRows } = await supabase
    .from('business_charge_templates')
    .select('name, default_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'management_fee');

  const policy = {};
  for (const row of policyRows || []) {
    policy[row.name] = row.default_value;
  }

  // Merge product fields into deal.extended
  const dealForCalc = {
    ...deal,
    cases_per_container:
      (deal.extended?.pallets_per_container && deal.extended?.cases_per_pallet)
        ? parseInt(deal.extended.pallets_per_container) * parseInt(deal.extended.cases_per_pallet)
        : deal.product?.cases_per_container || 100,
  };

  // Run the COS engine
  const cosResult = computeCOS(dealForCalc, policy, {});

  // Create cost matrix record
  const { data: matrix, error: matrixError } = await supabase
    .from('cost_matrices')
    .insert({
      deal_id:    params.id,
      leg_number: 1,
      version:    1,
      status:     'draft',
    })
    .select()
    .single();

  if (matrixError) return NextResponse.json({ error: matrixError.message }, { status: 500 });

  // Insert cost lines
  const linesToInsert = cosResultToDbLines(cosResult, matrix.id);
  const { data: lines, error: linesError } = await supabase
    .from('cost_lines')
    .insert(linesToInsert)
    .select();

  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

  // Update matrix with totals and selling price
  const sellingPrice = cosResult.sellingPricePerContainer;
  const totalCost    = cosResult.subtotalBeforeManagement;
  const grossMarginPct = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

  await supabase
    .from('cost_matrices')
    .update({
      total_cost:       totalCost,
      selling_price:    sellingPrice,
      gross_margin_pct: Math.round(grossMarginPct * 100) / 100,
    })
    .eq('id', matrix.id);

  return NextResponse.json(
    {
      matrix: {
        ...matrix,
        total_cost:    totalCost,
        selling_price: sellingPrice,
        gross_margin_pct: Math.round(grossMarginPct * 100) / 100,
      },
      cost_lines: lines,
      summary: {
        cases_per_container:        cosResult.casesPerContainer,
        supplier_cost_per_container:cosResult.supplierCostPerContainer,
        subtotal_before_management: cosResult.subtotalBeforeManagement,
        total_trading_margin:       cosResult.totalTradingMargin,
        selling_price_per_container:cosResult.sellingPricePerContainer,
        selling_price_per_case:     cosResult.sellingPricePerCase,
        buying_trader_margin:       cosResult.buyingTraderMargin,
        selling_trader_margin:      cosResult.sellingTraderMargin,
      },
    },
    { status: 201 }
  );
}

// GET - Get cost matrix for a deal
export async function GET(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: matrices, error } = await supabase
    .from('cost_matrices')
    .select('*, cost_lines(*)')
    .eq('deal_id', params.id)
    .order('version', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(matrices);
}
