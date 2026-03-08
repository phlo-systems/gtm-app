import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

// Fields that exist in the deals table
const DEAL_FIELDS = [
  'trade_type','transport_mode','user_role',
  'customer_id','supplier_id','product_id',
  'buy_incoterm','buy_location','sell_incoterm','sell_location',
  'unit_price','quantity','quantity_unit',
  'cost_currency','sales_currency','selling_price',
  'supplier_payment_terms','customer_payment_terms',
  'hs_code','expected_shipment_date',
]

function pickDealFields(body) {
  const clean = {}
  for (const key of DEAL_FIELDS) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      clean[key] = body[key]
    }
  }
  return clean
}

export async function GET(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      *,
      customer:counterparties!deals_customer_id_fkey(id, name, country, payment_terms),
      supplier:counterparties!deals_supplier_id_fkey(id, name, country, payment_terms),
      product:products(id, name, hs_code, units_per_case, cases_per_container),
      cost_matrices(
        id, version, status, total_cost, gross_margin_pct, locked_at,
        cost_lines(*)
      ),
      approvals(id, action, comment, created_at, user_id)
    `)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(deal)
}

export async function PUT(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: existing } = await supabase
    .from('deals')
    .select('status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft deals can be edited' }, { status: 403 })
  }

  // Handle inline counterparty creation
  if (body.customer_name && !body.customer_id) {
    const { data: cust } = await supabase
      .from('counterparties')
      .insert({ tenant_id: tenantId, name: body.customer_name, type: 'customer' })
      .select('id')
      .single()
    if (cust) body.customer_id = cust.id
  }

  if (body.supplier_name && !body.supplier_id) {
    const { data: supp } = await supabase
      .from('counterparties')
      .insert({ tenant_id: tenantId, name: body.supplier_name, type: 'supplier' })
      .select('id')
      .single()
    if (supp) body.supplier_id = supp.id
  }

  // Handle inline product creation
  if (body.product_name && !body.product_id) {
    const { data: prod } = await supabase
      .from('products')
      .insert({ tenant_id: tenantId, name: body.product_name, hs_code: body.hs_code })
      .select('id')
      .single()
    if (prod) body.product_id = prod.id
  }

  // Only send DB-safe fields
  const updateData = pickDealFields(body)

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      customer:counterparties!deals_customer_id_fkey(id, name),
      supplier:counterparties!deals_supplier_id_fkey(id, name),
      product:products(id, name, hs_code)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(deal)
}

export async function DELETE(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only delete drafts — first delete related records
  const { data: deal } = await supabase.from('deals').select('status').eq('id', params.id).eq('tenant_id', tenantId).single()
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.status !== 'draft') return NextResponse.json({ error: 'Only draft deals can be deleted' }, { status: 403 })

  // Delete cost lines via cost matrices
  const { data: matrices } = await supabase.from('cost_matrices').select('id').eq('deal_id', params.id)
  if (matrices && matrices.length > 0) {
    const matrixIds = matrices.map(m => m.id)
    await supabase.from('cost_lines').delete().in('matrix_id', matrixIds)
    await supabase.from('cost_matrices').delete().eq('deal_id', params.id)
  }

  await supabase.from('approvals').delete().eq('deal_id', params.id)
  const { error } = await supabase.from('deals').delete().eq('id', params.id).eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
