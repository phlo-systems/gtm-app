import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { generateCostMatrix, calculateMargin } from '@/lib/incoterms'

// POST - Generate a new cost matrix for a deal
export async function POST(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, product:products(units_per_case, cases_per_container)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (dealError || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // Get tenant's business charge templates
  const { data: chargeTemplates } = await supabase
    .from('business_charge_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order')

  // Generate cost lines using the incoterm engine
  const dealForCalc = {
    ...deal,
    units_per_case: deal.product?.units_per_case || 100,
    cases_per_container: deal.product?.cases_per_container || 100,
  }
  const costLines = generateCostMatrix(dealForCalc, chargeTemplates || [])

  // Create cost matrix record
  const { data: matrix, error: matrixError } = await supabase
    .from('cost_matrices')
    .insert({
      deal_id: params.id,
      leg_number: 1,
      version: 1,
      status: 'draft',
    })
    .select()
    .single()

  if (matrixError) return NextResponse.json({ error: matrixError.message }, { status: 500 })

  // Insert cost lines
  const linesToInsert = costLines.map(line => ({
    ...line,
    matrix_id: matrix.id,
  }))

  const { data: lines, error: linesError } = await supabase
    .from('cost_lines')
    .insert(linesToInsert)
    .select()

  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 })

  // Calculate totals and update matrix
  const totalCost = lines.filter(l => l.is_active).reduce((s, l) => s + (l.amount || 0), 0)
  const sellingPrice = deal.selling_price || totalCost * 1.15 // Default 15% markup

  await supabase
    .from('cost_matrices')
    .update({
      total_cost: totalCost,
      gross_margin_pct: sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice * 100) : 0,
    })
    .eq('id', matrix.id)

  return NextResponse.json({ matrix: { ...matrix, total_cost: totalCost }, cost_lines: lines }, { status: 201 })
}

// GET - Get cost matrix for a deal
export async function GET(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: matrices, error } = await supabase
    .from('cost_matrices')
    .select('*, cost_lines(*)')
    .eq('deal_id', params.id)
    .order('version', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(matrices)
}
