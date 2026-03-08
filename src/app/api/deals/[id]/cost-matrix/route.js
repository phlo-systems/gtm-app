import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { generateCostMatrix, calculateMargin } from '@/lib/incoterms'

// POST - Generate a new cost matrix for a deal
export async function POST(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, product:products(units_per_case, cases_per_container)')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (dealError || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const { data: chargeTemplates } = await supabase
    .from('business_charge_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order')

  const dealForCalc = {
    ...deal,
    units_per_case: deal.product?.units_per_case || 100,
    cases_per_container: deal.product?.cases_per_container || 100,
  }
  const costLines = generateCostMatrix(dealForCalc, chargeTemplates || [])

  const { data: matrix, error: matrixError } = await supabase
    .from('cost_matrices')
    .insert({ deal_id: params.id, leg_number: 1, version: 1, status: 'draft' })
    .select()
    .single()

  if (matrixError) return NextResponse.json({ error: matrixError.message }, { status: 500 })

  const linesToInsert = costLines.map(line => ({ ...line, matrix_id: matrix.id }))
  const { data: lines, error: linesError } = await supabase
    .from('cost_lines')
    .insert(linesToInsert)
    .select()

  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 })

  const totalCost = lines.filter(l => l.is_active).reduce((s, l) => s + (l.amount || 0), 0)
  const sellingPrice = deal.selling_price || totalCost * 1.15

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

// PUT - Update cost lines (edit amounts, add new lines, toggle active)
export async function PUT(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: deal } = await supabase
    .from('deals')
    .select('status, selling_price')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft deals can be edited' }, { status: 403 })
  }

  const matrixId = body.matrix_id
  if (!matrixId) return NextResponse.json({ error: 'matrix_id required' }, { status: 400 })

  // Update existing cost lines
  if (body.updates && body.updates.length > 0) {
    for (const upd of body.updates) {
      if (!upd.id) continue
      const updateFields = {}
      if (upd.amount !== undefined) updateFields.amount = parseFloat(upd.amount) || 0
      if (upd.is_active !== undefined) updateFields.is_active = upd.is_active
      if (upd.line_item !== undefined) updateFields.line_item = upd.line_item
      if (upd.responsibility !== undefined) updateFields.responsibility = upd.responsibility
      if (Object.keys(updateFields).length > 0) {
        await supabase.from('cost_lines').update(updateFields).eq('id', upd.id).eq('matrix_id', matrixId)
      }
    }
  }

  // Add new cost lines
  if (body.new_lines && body.new_lines.length > 0) {
    const { data: existingLines } = await supabase
      .from('cost_lines')
      .select('sort_order')
      .eq('matrix_id', matrixId)
      .order('sort_order', { ascending: false })
      .limit(1)

    let nextSort = (existingLines?.[0]?.sort_order ?? -1) + 1

    const linesToInsert = body.new_lines.map(line => ({
      matrix_id: matrixId,
      block: line.block || 'D',
      line_item: line.line_item || 'Additional Cost',
      cost_type: line.cost_type || 'additional',
      calc_type: 'fixed',
      amount: parseFloat(line.amount) || 0,
      amount_per_unit: 0,
      currency: line.currency || 'USD',
      source: 'manual',
      responsibility: line.responsibility || 'Trader',
      sort_order: nextSort++,
      is_active: true,
    }))

    await supabase.from('cost_lines').insert(linesToInsert)
  }

  // Delete lines if requested
  if (body.delete_ids && body.delete_ids.length > 0) {
    await supabase.from('cost_lines').delete().in('id', body.delete_ids).eq('matrix_id', matrixId)
  }

  // Recalculate totals
  const { data: allLines } = await supabase
    .from('cost_lines')
    .select('*')
    .eq('matrix_id', matrixId)
    .order('sort_order')

  const totalCost = (allLines || []).filter(l => l.is_active).reduce((s, l) => s + (l.amount || 0), 0)
  const sellingPrice = deal.selling_price || totalCost * 1.15
  const grossMarginPct = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice * 100) : 0

  await supabase
    .from('cost_matrices')
    .update({ total_cost: totalCost, gross_margin_pct: grossMarginPct })
    .eq('id', matrixId)

  const { data: updatedMatrix } = await supabase
    .from('cost_matrices')
    .select('*, cost_lines(*)')
    .eq('id', matrixId)
    .single()

  return NextResponse.json(updatedMatrix)
}
